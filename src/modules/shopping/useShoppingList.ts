import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../core/auth/authContext'
import { polishError } from '../../core/auth/errors'
import { isRetryable, readJSON, writeJSON } from '../../core/storage'
import { supabase } from '../../core/supabase/client'
import type { ShoppingItem } from '../../core/supabase/database.types'
import { detectCategory } from './categories'

const UNDO_MS = 5000
const RETRY_MS = 15000

type Patch = Pick<ShoppingItem, 'is_bought' | 'bought_by' | 'bought_at'>

/** Zmiana czekająca na wysłanie do bazy (kolejka działa też bez internetu). */
type Op =
  | { kind: 'insert'; item: ShoppingItem; restore?: boolean }
  | { kind: 'update'; id: string; patch: Patch }
  | { kind: 'delete'; ids: string[] }
  | { kind: 'clear'; ids: string[]; at: string }

/** Nakłada zmiany z kolejki na listę (żeby odświeżenie z bazy ich nie skasowało). */
function applyOps(list: ShoppingItem[], ops: Op[]): ShoppingItem[] {
  let out = list
  for (const op of ops) {
    if (op.kind === 'insert') {
      if (!out.some((i) => i.id === op.item.id)) out = [...out, op.item]
    } else if (op.kind === 'update') {
      out = out.map((i) => (i.id === op.id ? { ...i, ...op.patch } : i))
    } else {
      // delete (na stałe) i clear (do historii) — z listy znikają tak samo
      out = out.filter((i) => !op.ids.includes(i.id))
    }
  }
  return out
}

/** Kilka dodań albo usunięć z rzędu wysyłamy jednym zapytaniem. */
function takeBatch(queue: Op[]): Op[] {
  const first = queue[0]
  if ((first.kind !== 'insert' || first.restore) && first.kind !== 'delete') return [first]
  const batch: Op[] = [first]
  for (const op of queue.slice(1, 50)) {
    const same = first.kind === 'insert' ? op.kind === 'insert' && !op.restore : op.kind === 'delete'
    if (!same) break
    batch.push(op)
  }
  return batch
}

/** Wysyła zmiany. 'retry' = brak internetu, spróbujemy później. */
async function send(batch: Op[]): Promise<'ok' | 'retry' | { rejected: string }> {
  const op = batch[0]
  let res
  if (op.kind === 'insert') {
    const rows = batch.map((o) => {
      const { id, name, quantity, category, added_by, is_bought, bought_by, bought_at, created_at } = (
        o as Extract<Op, { kind: 'insert' }>
      ).item
      return op.restore
        ? { id, name, quantity, category, added_by, is_bought, bought_by, bought_at, created_at }
        : { id, name, category }
    })
    // Ponowne wysłanie (np. odpowiedź zginęła przy słabym zasięgu) — już jest w bazie, pomijamy.
    res = await supabase.from('shopping_items').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
  } else if (op.kind === 'update') {
    res = await supabase.from('shopping_items').update(op.patch).eq('id', op.id)
  } else if (op.kind === 'clear') {
    res = await supabase.from('shopping_items').update({ cleared_at: op.at }).in('id', op.ids)
  } else {
    const ids = batch.flatMap((o) => (o as Extract<Op, { kind: 'delete' }>).ids)
    res = await supabase.from('shopping_items').delete().in('id', ids)
  }
  if (!res.error) return 'ok'
  if (isRetryable(res.error, res.status)) return 'retry'
  return { rejected: polishError(res.error) }
}

/**
 * Lista zakupów domu.
 * - Ostatnia lista i niewysłane zmiany są w pamięci telefonu → działa bez internetu.
 * - Każda zmiana pokazuje się od razu i trafia do kolejki, która sama się wysyła.
 * - Zmiany od innych osób przychodzą na żywo (Realtime).
 */
export function useShoppingList() {
  const { household, profile } = useAuth()
  const hid = household?.id ?? 'brak'
  const itemsKey = `shopping:${hid}:items`
  const outboxKey = `shopping:${hid}:outbox`

  const [initialOutbox] = useState(() => readJSON<Op[]>(outboxKey) ?? [])
  const outbox = useRef<Op[]>(initialOutbox)
  const inFlight = useRef<Op[] | null>(null)
  const flushing = useRef(false)

  const [cachedItems] = useState(() => readJSON<ShoppingItem[]>(itemsKey))
  const [items, setItems] = useState<ShoppingItem[]>(() => applyOps(cachedItems ?? [], initialOutbox))
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(cachedItems ? 'ready' : 'loading')
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(() => !navigator.onLine)
  const [pendingCount, setPendingCount] = useState(initialOutbox.length)
  const [lastRemoved, setLastRemoved] = useState<ShoppingItem | null>(null)
  const lastDelete = useRef<{ item: ShoppingItem; op: Op; timer: number } | null>(null)

  // Lista zapisywana w telefonie przy każdej zmianie.
  useEffect(() => {
    if (status === 'ready') writeJSON(itemsKey, items)
  }, [items, status, itemsKey])

  const saveOutbox = useCallback(() => {
    writeJSON(outboxKey, outbox.current)
    setPendingCount(outbox.current.length)
  }, [outboxKey])

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase.from('shopping_items').select('*').is('cleared_at', null).order('created_at')
    if (error) {
      if (isRetryable(error)) setOffline(true)
      // Zostawiamy to, co już widać (np. listę z pamięci telefonu).
      setStatus((s) => (s === 'ready' ? s : 'error'))
      return
    }
    setItems(applyOps(data, outbox.current))
    setStatus('ready')
  }, [])

  /** Wysyła kolejkę po kolei. Przy braku internetu przerywa i czeka. */
  const flush = useCallback(async () => {
    if (flushing.current) return
    flushing.current = true
    let rejected = false
    try {
      while (outbox.current.length > 0) {
        const batch = takeBatch(outbox.current)
        inFlight.current = batch
        const result = await send(batch)
        inFlight.current = null
        if (result === 'retry') {
          setOffline(true)
          return
        }
        outbox.current = outbox.current.filter((o) => !batch.includes(o))
        saveOutbox()
        if (result !== 'ok') {
          rejected = true
          setError(result.rejected)
        }
      }
      setOffline(false)
    } finally {
      inFlight.current = null
      flushing.current = false
    }
    if (rejected) fetchAll() // baza odrzuciła zmianę — pokaż prawdziwy stan
  }, [saveOutbox, fetchAll])

  const enqueue = useCallback(
    (op: Op) => {
      setError('')
      setItems((list) => applyOps(list, [op]))
      outbox.current = [...outbox.current, op]
      saveOutbox()
      flush()
    },
    [saveOutbox, flush],
  )

  // Wczytanie + nasłuch zmian od innych osób + ponawianie wysyłki.
  useEffect(() => {
    if (!household) return

    const upsert = (row: ShoppingItem) => {
      if (row.cleared_at) {
        // Wyczyszczone przez kogoś innego — znika z listy (zostaje w historii).
        setItems((list) => list.filter((i) => i.id !== row.id))
        return
      }
      setItems((list) => {
        const idx = list.findIndex((i) => i.id === row.id)
        const next = idx === -1 ? [...list, row] : list.map((i) => (i.id === row.id ? row : i))
        return applyOps(next, outbox.current)
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
        // Po każdym (ponownym) połączeniu: wyślij zaległe zmiany i dociągnij pełną listę.
        if (state === 'SUBSCRIBED') flush().then(fetchAll)
      })

    const sync = () => flush().then(fetchAll)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync()
    }
    const onOffline = () => setOffline(true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', sync)
    window.addEventListener('offline', onOffline)
    const retry = window.setInterval(() => {
      if (outbox.current.length > 0) flush()
    }, RETRY_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', onOffline)
      clearInterval(retry)
      supabase.removeChannel(channel)
    }
  }, [household, fetchAll, flush])

  useEffect(() => () => clearTimeout(lastDelete.current?.timer), [])

  const add = useCallback(
    (rawName: string) => {
      if (!household || !profile) return
      let name = rawName.trim().replace(/\s+/g, ' ').slice(0, 100)
      if (!name) return
      name = name.charAt(0).toUpperCase() + name.slice(1)
      enqueue({
        kind: 'insert',
        item: {
          id: crypto.randomUUID(),
          household_id: household.id,
          name,
          quantity: null,
          category: detectCategory(name),
          added_by: profile.id,
          is_bought: false,
          bought_by: null,
          bought_at: null,
          cleared_at: null,
          created_at: new Date().toISOString(),
        },
      })
    },
    [household, profile, enqueue],
  )

  const toggle = useCallback(
    (item: ShoppingItem) => {
      if (!profile) return
      const bought = !item.is_bought
      enqueue({
        kind: 'update',
        id: item.id,
        patch: {
          is_bought: bought,
          bought_by: bought ? profile.id : null,
          bought_at: bought ? new Date().toISOString() : null,
        },
      })
    },
    [profile, enqueue],
  )

  /** Usuwa (od razu, albo gdy wróci internet); przez kilka sekund można cofnąć. */
  const remove = useCallback(
    (item: ShoppingItem) => {
      clearTimeout(lastDelete.current?.timer)
      const op: Op = { kind: 'delete', ids: [item.id] }
      enqueue(op)
      const timer = window.setTimeout(() => {
        lastDelete.current = null
        setLastRemoved(null)
      }, UNDO_MS)
      lastDelete.current = { item, op, timer }
      setLastRemoved(item)
    },
    [enqueue],
  )

  /** Przywraca ostatnio usunięty produkt (z tym samym autorem i stanem). */
  const undo = useCallback(() => {
    const d = lastDelete.current
    if (!d) return
    clearTimeout(d.timer)
    lastDelete.current = null
    setLastRemoved(null)
    const queued = outbox.current.includes(d.op) && !inFlight.current?.includes(d.op)
    if (queued) {
      // Usunięcie jeszcze nie wyszło (np. brak internetu) — po prostu je anulujemy.
      outbox.current = outbox.current.filter((o) => o !== d.op)
      saveOutbox()
      setItems((list) => [...list, d.item])
    } else {
      // Usunięcie już poszło do bazy — wstawiamy produkt ponownie, pod NOWYM id.
      // Dzięki temu spóźnione powiadomienie o usunięciu (Realtime nie gwarantuje kolejności)
      // nie skasuje przywróconego produktu z ekranów.
      enqueue({ kind: 'insert', item: { ...d.item, id: crypto.randomUUID() }, restore: true })
    }
  }, [enqueue, saveOutbox])

  const clearBought = useCallback(() => {
    const ids = items.filter((i) => i.is_bought).map((i) => i.id)
    if (ids.length > 0) enqueue({ kind: 'clear', ids, at: new Date().toISOString() })
  }, [items, enqueue])

  return {
    items,
    status,
    error,
    offline,
    pendingCount,
    lastRemoved,
    add,
    toggle,
    remove,
    undo,
    clearBought,
    reload: fetchAll,
  }
}
