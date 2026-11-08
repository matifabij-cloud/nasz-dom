import type { ShoppingItem } from '../../core/supabase/database.types'

type Props = {
  item: ShoppingItem
  color?: string
  addedByName?: string
  onToggle: () => void
  onRemove: () => void
}

/** Jeden produkt: kliknięcie = kupione / cofnij, „×” = usuń. */
export function ShoppingItemRow({ item, color, addedByName, onToggle, onRemove }: Props) {
  return (
    <li className="flex items-stretch border-b border-stone-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex min-h-14 flex-1 items-center gap-3 py-2 pl-4 text-left active:bg-stone-50"
        aria-pressed={item.is_bought}
      >
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${
            item.is_bought ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-400'
          }`}
          aria-hidden="true"
        >
          {item.is_bought && (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className={`text-lg break-words ${item.is_bought ? 'text-stone-400 line-through' : ''}`}>{item.name}</span>
        {color && (
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: color, opacity: item.is_bought ? 0.4 : 1 }}
            title={addedByName ? `Dodał(a): ${addedByName}` : undefined}
            aria-label={addedByName ? `Dodał(a): ${addedByName}` : undefined}
          />
        )}
      </button>
      <button
        onClick={onRemove}
        aria-label={`Usuń ${item.name}`}
        className="flex w-14 shrink-0 items-center justify-center text-stone-400 active:bg-stone-100 active:text-red-600"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  )
}
