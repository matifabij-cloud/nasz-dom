import { relativeDay } from '../../core/format'
import type { Member } from '../../core/household/useMembers'
import type { Task } from '../../core/supabase/database.types'
import { ColorDot } from '../../core/ui/ColorDot'

type Props = {
  task: Task
  me: string | null
  members: Map<string, Member>
  onTake: () => void
  onRelease: () => void
  onDone: () => void
  onReopen: () => void
  onRemove: () => void
}

const btn = 'flex min-h-12 items-center justify-center rounded-xl px-4 text-lg font-semibold'
const primary = `${btn} bg-brand-700 text-white active:bg-brand-800`
const secondary = `${btn} border-2 border-stone-300 bg-white text-stone-900 active:bg-stone-100`

export function TaskCard({ task, me, members, onTake, onRelease, onDone, onReopen, onRemove }: Props) {
  const author = task.created_by ? members.get(task.created_by) : undefined
  const taker = task.taken_by ? members.get(task.taken_by) : undefined
  const doer = task.done_by ? members.get(task.done_by) : undefined
  const isDone = !!task.done_at
  const mine = task.taken_by === me

  return (
    <li className={`rounded-2xl bg-white p-4 shadow-sm ${isDone ? 'opacity-75' : ''}`}>
      <div className="flex items-start gap-2">
        <p className={`flex-1 pt-1 text-lg font-medium break-words ${isDone ? 'text-stone-500 line-through' : ''}`}>
          {task.title}
        </p>
        <button
          onClick={onRemove}
          aria-label={`Usuń ${task.title}`}
          className="-mt-2 -mr-2 flex size-12 shrink-0 items-center justify-center rounded-full text-stone-400 active:bg-stone-100 active:text-red-600"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="mt-1 flex items-center gap-2 text-stone-500">
        <ColorDot color={author?.color} />
        {author?.display_name ?? 'Ktoś'} · {relativeDay(task.created_at)}
      </p>

      {isDone ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-medium text-brand-800">
            <span aria-hidden="true">✓</span> {doer?.display_name ?? 'Ktoś'} · {relativeDay(task.done_at)}
          </p>
          <button onClick={onReopen} className="min-h-12 px-2 font-medium text-stone-600 underline">
            Przywróć
          </button>
        </div>
      ) : task.taken_by ? (
        <>
          <p className="mt-3 flex items-center gap-2 font-medium">
            <ColorDot color={taker?.color} className="size-4" />
            {mine ? 'Zajmujesz się tym' : `Zajmuje się: ${taker?.display_name ?? 'ktoś'}`}
          </p>
          <div className={`mt-3 grid gap-2 ${mine ? 'grid-cols-[2fr_1fr]' : 'grid-cols-1'}`}>
            <button onClick={onDone} className={primary}>Zrobione</button>
            {mine && <button onClick={onRelease} className={secondary}>Oddaj</button>}
          </div>
        </>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onTake} className={primary}>Biorę to</button>
          <button onClick={onDone} className={secondary}>Zrobione</button>
        </div>
      )}
    </li>
  )
}
