import { useCallback, useMemo } from 'react'
import { useAuth } from '../../core/auth/authContext'
import { useSyncedTable, type SyncOptions } from '../../core/sync/useSyncedTable'
import type { Task } from '../../core/supabase/database.types'

/** Zrobione sprawy znikają z ekranu po tylu dniach (w bazie zostają). */
export const DONE_VISIBLE_DAYS = 7
const doneSince = () => new Date(Date.now() - DONE_VISIBLE_DAYS * 86_400_000).toISOString()

const options: SyncOptions<Task> = {
  table: 'tasks',
  keep: (t) => !t.done_at || t.done_at >= doneSince(),
  narrow: (q) => q.or(`done_at.is.null,done_at.gte.${doneSince()}`),
}

export function useTasks() {
  const { household, profile } = useAuth()
  const { rows, insert, update, remove, ...rest } = useSyncedTable<Task>(options)
  const me = profile?.id ?? null
  const now = () => new Date().toISOString()

  const add = useCallback(
    (rawTitle: string) => {
      if (!household || !me) return
      let title = rawTitle.trim().replace(/\s+/g, ' ').slice(0, 200)
      if (!title) return
      title = title.charAt(0).toUpperCase() + title.slice(1)
      insert({
        id: crypto.randomUUID(),
        household_id: household.id,
        title,
        created_by: me,
        taken_by: null,
        taken_at: null,
        done_by: null,
        done_at: null,
        created_at: now(),
      })
    },
    [household, me, insert],
  )

  const take = useCallback((t: Task) => update(t.id, { taken_by: me, taken_at: now() }), [me, update])
  const release = useCallback((t: Task) => update(t.id, { taken_by: null, taken_at: null }), [update])
  const markDone = useCallback((t: Task) => update(t.id, { done_by: me, done_at: now() }), [me, update])
  const reopen = useCallback((t: Task) => update(t.id, { done_by: null, done_at: null }), [update])
  const removeTask = useCallback((t: Task) => remove(t.id), [remove])

  const groups = useMemo(() => {
    const t = (iso: string | null) => (iso ? Date.parse(iso) : 0)
    return {
      // Najstarsze na górze — czekają najdłużej.
      open: rows.filter((r) => !r.done_at && !r.taken_by).sort((a, b) => t(a.created_at) - t(b.created_at)),
      taken: rows.filter((r) => !r.done_at && r.taken_by).sort((a, b) => t(a.taken_at) - t(b.taken_at)),
      // Ostatnio zrobione na górze.
      finished: rows.filter((r) => r.done_at).sort((a, b) => t(b.done_at) - t(a.done_at)),
    }
  }, [rows])

  return { ...rest, ...groups, me, add, take, release, markDone, reopen, remove: removeTask }
}
