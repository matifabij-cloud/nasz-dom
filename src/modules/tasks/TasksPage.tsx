import { useMemo } from 'react'
import { useMembers } from '../../core/household/useMembers'
import type { Task } from '../../core/supabase/database.types'
import { Button } from '../../core/ui/Button'
import { ErrorMessage } from '../../core/ui/ErrorMessage'
import { OfflineBanner } from '../../core/ui/OfflineBanner'
import { QuickAddForm } from '../../core/ui/QuickAddForm'
import { Spinner } from '../../core/ui/Spinner'
import { TaskCard } from './TaskCard'
import { DONE_VISIBLE_DAYS, useTasks } from './useTasks'

export default function TasksPage() {
  const { open, taken, finished, me, status, error, offline, pendingCount, add, take, release, markDone, reopen, remove, reload } =
    useTasks()
  const members = useMembers()
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  function confirmRemove(t: Task) {
    if (window.confirm(`Usunąć sprawę „${t.title}”?`)) remove(t)
  }

  const section = (title: string, list: Task[]) =>
    list.length > 0 && (
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">
          {title} ({list.length})
        </h2>
        <ul className="space-y-3">
          {list.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              me={me}
              members={memberById}
              onTake={() => take(t)}
              onRelease={() => release(t)}
              onDone={() => markDone(t)}
              onReopen={() => reopen(t)}
              onRemove={() => confirmRemove(t)}
            />
          ))}
        </ul>
      </section>
    )

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 bg-stone-100 p-3 shadow-[0_6px_6px_-6px_rgba(0,0,0,0.15)]">
        <QuickAddForm onAdd={add} placeholder="Co trzeba załatwić?" maxLength={200} />
        <OfflineBanner offline={offline} pendingCount={pendingCount} />
        {error && (
          <div className="mt-2">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        )}
      </div>

      {status === 'loading' && <Spinner />}

      {status === 'error' && (
        <div className="space-y-3 p-4">
          <ErrorMessage>Nie udało się wczytać spraw. Sprawdź internet.</ErrorMessage>
          <Button onClick={reload}>Spróbuj ponownie</Button>
        </div>
      )}

      {status === 'ready' && (
        <div className="space-y-5 px-3 pt-1">
          {open.length === 0 && taken.length === 0 && (
            <div className="px-3 py-10 text-center text-stone-500">
              <p className="text-xl font-medium">Wszystko załatwione</p>
              <p className="mt-2 text-lg">Wpisz u góry, co trzeba zrobić — np. „Odebrać paczkę”.</p>
            </div>
          )}
          {section('Do wzięcia', open)}
          {section('W trakcie', taken)}
          {section(`Zrobione (ostatnie ${DONE_VISIBLE_DAYS} dni)`, finished)}
        </div>
      )}
    </div>
  )
}
