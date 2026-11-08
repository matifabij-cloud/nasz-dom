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

  // Dodane u nas, ale jeszcze niepotwierdzone przez bazę — odświeżenie listy ich nie skasuje.
  const unconfirmed = useRef(new Map<string, ShoppingItem>())
  // Ostatnie usunięcie (do „Cofnij”): czekamy, aż baza je potwierdzi, zanim przywrócimy.
  const lastDelete = useRef<{ item: ShoppingItem; done: Promise<boolean>; timer: number } | null>(null)

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase.from('shopping_items').select('*').order('created_at')
    if (error) {
      // Przy nieudanym odświeżeniu zostawiamy to, co już widać.
      setStatus((s) => (s === 'ready' ? s : 'error'))
      return
    }
    const ids = new Set(data.map((i) => i.id))
    const local = [...unconfirmed.current.values()].filter((i) => !ids.has(i.id))
    setItems([...data, ...local])
    setStatus('ready')
  }, [])

  // Wczytanie + nasłuch zmian od innych osób.
  useEffect(() => {
    if (!household) return

    const upsert = (row: ShoppingItem) => {
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
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', fetchAll)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', fetchAll)
      supabase.removeChannel(channel)
    }
  }, [household, fetchAll])

  useEffect(() => () => clearTimeout(lastDelete.current?.timer), [])

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
      unconfirmed.current.set(item.id, item)
      setItems((list) => [...list, item])
      const { error } = await supabase
        .from('shopping_items')
        .insert({ id: item.id, name: item.name, category: item.category })
      unconfirmed.current.delete(item.id)
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

  /** Usuwa od razu z bazy; przez kilka sekund można cofnąć. */
  const remove = useCallback(
    (item: ShoppingItem) => {
      setError('')
      clearTimeout(lastDelete.current?.timer)
      setItems((list) => list.filter((i) => i.id !== item.id))
      const done = Promise.resolve(supabase.from('shopping_items').delete().eq('id', item.id)).then(({ error }) => {
        if (error) {
          setError(polishError(error))
          fetchAll()
        }
        return !error
      })
      const timer = window.setTimeout(() => {
        lastDelete.current = null
        setLastRemoved(null)
      }, UNDO_MS)
      lastDelete.current = { item, done, timer }
      setLastRemoved(item)
    },
    [fetchAll],
  )

  /** Przywraca ostatnio usunięty produkt (z tym samym autorem i stanem). */
  const undo = useCallback(async () => {
    const d = lastDelete.current
    if (!d) return
    clearTimeout(d.timer)
    lastDelete.current = null
    setLastRemoved(null)
    setItems((list) => [...list, d.item])
    if (!(await d.done)) return // usunięcie się nie udało — produkt i tak jest w bazie
    const { id, name, quantity, category, added_by, is_bought, bought_by, bought_at, created_at } = d.item
    const { error } = await supabase
      .from('shopping_items')
      .insert({ id, name, quantity, category, added_by, is_bought, bought_by, bought_at, created_at })
    if (error) {
      setItems((list) => list.filter((i) => i.id !== id))
      setError(polishError(error))
    }
  }, [])

  const clearBought = useCallback(async () => {
    const ids = items.filter((i) => i.is_bought).map((i) => i.id)
    if (ids.length === 0) return
    setError('')
    setItems((list) => list.filter((i) => !i.is_bought))
    const { error } = await supabase.from('shopping_items').delete().in('id', ids)
    if (error) {
      setError(polishError(error))
      fetchAll()
    }
  }, [items, fetchAll])

  return { items, status, error, lastRemoved, add, toggle, remove, undo, clearBought, reload: fetchAll }
}
