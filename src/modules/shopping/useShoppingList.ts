import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../core/auth/authContext'
import { polishError } from '../../core/auth/errors'
import { supabase } from '../../core/supabase/client'
import type { ShoppingItem } from '../../core/supabase/database.types'
import { detectCategory } from './categories'

const UNDO_MS = 5000

/**
 * Lista zakupów domu: wczytanie, zmiany na żywo (Realtime) i operacje.
 * Zmiany pokazują się od razu, a dopiero potem idą do bazy.
 */
export function useShoppingList() {
  const { household, profile } = useAuth()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [lastRemoved, setLastRemoved] = useState<ShoppingItem | null>(null)

  // Usunięcie czeka kilka sekund na ewentualne „Cofnij”.
  const pending = useRef<{ item: ShoppingItem; timer: number } | null>(null)
  const isPending = (id: string) => pending.current?.item.id === id

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase.from('shopping_items').select('*').order('created_at')
    if (error) {
      // Przy nieudanym odświeżeniu zostawiamy to, co już widać.
      setStatus((s) => (s === 'ready' ? s : 'error'))
      return
    }
    setItems(data.filter((i) => !isPending(i.id)))
    setStatus('ready')
  }, [])

  const commitPending = useCallback(() => {
    const p = pending.current
    if (!p) return
    clearTimeout(p.timer)
    pending.current = null
    setLastRemoved(null)
    supabase
      .from('shopping_items')
      .delete()
      .eq('id', p.item.id)
      .then(({ error }) => {
        if (error) {
          setError(polishError(error))
          fetchAll()
        }
      })
  }, [fetchAll])

  // Wczytanie + nasłuch zmian od innych osób.
  useEffect(() => {
    if (!household) return

    const upsert = (row: ShoppingItem) => {
      if (isPending(row.id)) return
      setItems((list) => {
        const idx = list.findIndex((i) => i.id === row.id)
        if (idx === -1) return [...list, row]
        const copy = list.slice()
        copy[idx] = row
        return copy
      })
    }

    const channel = supabase
      .channel(`shopping:${household.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shopping_items', filter: `household_id=eq.${household.id}` },
        (payload) => upsert(payload.new as ShoppingItem),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shopping_items', filter: `household_id=eq.${household.id}` },
        (payload) => upsert(payload.new as ShoppingItem),
      )
      // Usunięć nie da się filtrować po domu — przychodzi samo id, nieznane ignorujemy.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'shopping_items' }, (payload) => {
        const id = (payload.old as { id?: string }).id
        if (id) setItems((list) => list.filter((i) => i.id !== id))
      })
      .subscribe((state) => {
        // Po każdym (ponownym) połączeniu dociągamy pełną listę — nic nie umknie.
        if (state === 'SUBSCRIBED') fetchAll()
      })

    // Telefon w tle zrywa połączenie — po powrocie do apki odświeżamy listę.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchAll()
      else commitPending()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', fetchAll)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', fetchAll)
      supabase.removeChannel(channel)
    }
  }, [household, fetchAll, commitPending])

  // Wyjście z ekranu = usunięcie od razu (bez czekania na „Cofnij”).
  useEffect(() => () => commitPending(), [commitPending])

  const add = useCallback(
    async (rawName: string) => {
      if (!household || !profile) return
      let name = rawName.trim().replace(/\s+/g, ' ').slice(0, 100)
      if (!name) return
      name = name.charAt(0).toUpperCase() + name.slice(1)
      setError('')
      const item: ShoppingItem = {
        id: crypto.randomUUID(),
        household_id: household.id,
        name,
        quantity: null,
        category: detectCategory(name),
        added_by: profile.id,
        is_bought: false,
        bought_by: null,
        bought_at: null,
        created_at: new Date().toISOString(),
      }
      setItems((list) => [...list, item])
      const { error } = await supabase
        .from('shopping_items')
        .insert({ id: item.id, name: item.name, category: item.category })
      if (error) {
        setItems((list) => list.filter((i) => i.id !== item.id))
        setError(polishError(error))
      }
    },
    [household, profile],
  )

  const toggle = useCallback(
    async (item: ShoppingItem) => {
      if (!profile) return
      setError('')
      const bought = !item.is_bought
      const patch = {
        is_bought: bought,
        bought_by: bought ? profile.id : null,
        bought_at: bought ? new Date().toISOString() : null,
      }
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))
      const { error } = await supabase.from('shopping_items').update(patch).eq('id', item.id)
      if (error) {
        setError(polishError(error))
        fetchAll()
      }
    },
    [profile, fetchAll],
  )

  const remove = useCallback(
    (item: ShoppingItem) => {
      commitPending() // poprzednie usunięcie zatwierdzamy od razu
      setError('')
      setItems((list) => list.filter((i) => i.id !== item.id))
      pending.current = { item, timer: window.setTimeout(commitPending, UNDO_MS) }
      setLastRemoved(item)
    },
    [commitPending],
  )

  const undo = useCallback(() => {
    const p = pending.current
    if (!p) return
    clearTimeout(p.timer)
    pending.current = null
    setLastRemoved(null)
    setItems((list) => [...list, p.item])
  }, [])

  const clearBought = useCallback(async () => {
    commitPending()
    const ids = items.filter((i) => i.is_bought).map((i) => i.id)
    if (ids.length === 0) return
    setError('')
    setItems((list) => list.filter((i) => !i.is_bought))
    const { error } = await supabase.from('shopping_items').delete().in('id', ids)
    if (error) {
      setError(polishError(error))
      fetchAll()
    }
  }, [items, commitPending, fetchAll])

  return { items, status, error, lastRemoved, add, toggle, remove, undo, clearBought, reload: fetchAll }
}
