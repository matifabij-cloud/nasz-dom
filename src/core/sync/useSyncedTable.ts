import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '../auth/authContext'
import { polishError } from '../auth/errors'
import { isRetryable, readJSON, writeJSON } from '../storage'
import { supabase } from '../supabase/client'

/**
 * Wspólna synchronizacja tabel modułów (każda ma id i household_id).
 *
 * - dane i niewysłane zmiany są w pamięci telefonu → działa bez internetu,
 * - każda zmiana pokazuje się od razu i trafia do kolejki, która sama się wysyła,
 * - zmiany od innych domowników przychodzą na żywo (Realtime).
 *
 * Nowy moduł: wywołaj useSyncedTable({ table: 'moja_tabela' }) i gotowe.
 */

export type SyncedRow = { id: string; household_id: string; created_at: string }

export type SyncOp<T> =
  | { kind: 'insert'; row: T }
  | { kind: 'update'; id: string; patch: Partial<T> }
  | { kind: 'delete'; id: string }

type Query = ReturnType<ReturnType<SupabaseClient['from']>['select']>

export type SyncOptions<T> = {
  /** Tabela w bazie (z kolumnami id, household_id, created_at). */
  table: string
  /** Które wiersze trzymać na ekranie. Funkcja zdefiniowana POZA komponentem. */
  keep?: (row: T) => boolean
  /** Zawężenie zapytania, np. tylko ostatnie dni. Funkcja zdefiniowana POZA komponentem. */
  narrow?: (query: Query) => Query
}

// Moduły używają różnych tabel — tu klient bez typów konkretnej tabeli.
const db = supabase as unknown as SupabaseClient

const RETRY_MS = 15000

export function applyOps<T extends SyncedRow>(rows: T[], ops: SyncOp<T>[]): T[] {
  let out = rows
  for (const op of ops) {
    if (op.kind === 'insert') {
      if (!out.some((r) => r.id === op.row.id)) out = [...out, op.row]
    } else if (op.kind === 'update') {
      out = out.map((r) => (r.id === op.id ? { ...r, ...op.patch } : r))
    } else {
      out = out.filter((r) => r.id !== op.id)
    }
  }
  return out
}

/** Kilka dodań albo usunięć z rzędu wysyłamy jednym zapytaniem. */
function takeBatch<T>(queue: SyncOp<T>[]): SyncOp<T>[] {
  const first = queue[0]
  if (first.kind === 'update') return [first]
  const batch = [first]
  for (const op of queue.slice(1, 50)) {
    if (op.kind !== first.kind) break
    batch.push(op)
  }
  return batch
}

async function send<T extends SyncedRow>(table: string, batch: SyncOp<T>[]): Promise<'ok' | 'retry' | { rejected: string }> {
  const op = batch[0]
  let res
  if (op.kind === 'insert') {
    const rows = batch.map((o) => (o as Extract<SyncOp<T>, { kind: 'insert' }>).row)
    // Ponowne wysłanie (np. odpowiedź zginęła przy słabym zasięgu) — już jest w bazie, pomijamy.
    res = await db.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
  } else if (op.kind === 'update') {
    res = await db.from(table).update(op.patch as Record<string, unknown>).eq('id', op.id)
  } else {
    const ids = batch.map((o) => (o as Extract<SyncOp<T>, { kind: 'delete' }>).id)
    res = await db.from(table).delete().in('id', ids)
  }
  if (!res.error) return 'ok'
  if (isRetryable(res.error, res.status)) return 'retry'
  return { rejected: polishError(res.error) }
}

export function useSyncedTable<T extends SyncedRow>({ table, keep, narrow }: SyncOptions<T>) {
  const { household } = useAuth()
  const hid = household?.id ?? 'brak'
  const rowsKey = `${table}:${hid}:rows`
  const outboxKey = `${table}:${hid}:outbox`

  const [initialOutbox] = useState(() => readJSON<SyncOp<T>[]>(outboxKey) ?? [])
  const [cachedRows] = useState(() => readJSON<T[]>(rowsKey))
  const outbox = useRef<SyncOp<T>[]>(initialOutbox)
  const inFlight = useRef<SyncOp<T>[] | null>(null)
  const flushing = useRef(false)

  const [rows, setRows] = useState<T[]>(() => applyOps(cachedRows ?? [], initialOutbox))
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(cachedRows ? 'ready' : 'loading')
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(() => !navigator.onLine)
  const [pendingCount, setPendingCount] = useState(initialOutbox.length)

  const visible = useCallback((list: T[]) => (keep ? list.filter(keep) : list), [keep])

  useEffect(() => {
    if (status === 'ready') writeJSON(rowsKey, rows)
  }, [rows, status, rowsKey])

  const saveOutbox = useCallback(() => {
    writeJSON(outboxKey, outbox.current)
    setPendingCount(outbox.current.length)
  }, [outboxKey])

  const fetchAll = useCallback(async () => {
    let query = db.from(table).select('*').order('created_at')
    if (narrow) query = narrow(query)
    const { data, error } = await query
    if (error) {
      if (isRetryable(error)) setOffline(true)
      setStatus((s) => (s === 'ready' ? s : 'error'))
      return
    }
    setRows(visible(applyOps(data as T[], outbox.current)))
    setStatus('ready')
  }, [table, narrow, visible])

  const flush = useCallback(async () => {
    if (flushing.current) return
    flushing.current = true
    let rejected = false
    try {
      while (outbox.current.length > 0) {
        const batch = takeBatch(outbox.current)
        inFlight.current = batch
        const result = await send(table, batch)
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
    if (rejected) fetchAll()
  }, [table, saveOutbox, fetchAll])

  const enqueue = useCallback(
    (op: SyncOp<T>) => {
      setError('')
      setRows((list) => visible(applyOps(list, [op])))
      outbox.current = [...outbox.current, op]
      saveOutbox()
      flush()
    },
    [visible, saveOutbox, flush],
  )

  useEffect(() => {
    if (!household) return

    const upsert = (row: T) =>
      setRows((list) => {
        const next = list.some((r) => r.id === row.id) ? list.map((r) => (r.id === row.id ? row : r)) : [...list, row]
        return visible(applyOps(next, outbox.current))
      })

    const filter = `household_id=eq.${household.id}`
    const channel = supabase
      .channel(`${table}:${household.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, (p) => upsert(p.new as T))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, (p) => upsert(p.new as T))
      // Usunięć nie da się filtrować po domu — przychodzi samo id, nieznane ignorujemy.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (p) => {
        const id = (p.old as { id?: string }).id
        if (id) setRows((list) => list.filter((r) => r.id !== id))
      })
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') flush().then(fetchAll)
      })

    const sync = () => flush().then(fetchAll)
    const onVisibility = () => document.visibilityState === 'visible' && sync()
    const onOffline = () => setOffline(true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', sync)
    window.addEventListener('offline', onOffline)
    const retry = window.setInterval(() => outbox.current.length > 0 && flush(), RETRY_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', onOffline)
      clearInterval(retry)
      supabase.removeChannel(channel)
    }
  }, [household, table, visible, fetchAll, flush])

  const insert = useCallback((row: T) => enqueue({ kind: 'insert', row }), [enqueue])
  const update = useCallback((id: string, patch: Partial<T>) => enqueue({ kind: 'update', id, patch }), [enqueue])
  const remove = useCallback((id: string) => enqueue({ kind: 'delete', id }), [enqueue])

  return { rows, status, error, offline, pendingCount, insert, update, remove, reload: fetchAll }
}
