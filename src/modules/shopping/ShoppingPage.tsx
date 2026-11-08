import { useMemo } from 'react'
import { useMembers } from '../../core/household/useMembers'
import type { ShoppingItem } from '../../core/supabase/database.types'
import { Button } from '../../core/ui/Button'
import { ErrorMessage } from '../../core/ui/ErrorMessage'
import { Spinner } from '../../core/ui/Spinner'
import { AddItemForm } from './AddItemForm'
import { CATEGORIES } from './categories'
import { ShoppingItemRow } from './ShoppingItemRow'
import { useShoppingList } from './useShoppingList'

/** Niekupione na górze (od najstarszego), kupione na dole działu (w kolejności kupowania). */
function compareItems(a: ShoppingItem, b: ShoppingItem) {
  if (a.is_bought !== b.is_bought) return a.is_bought ? 1 : -1
  const ka = a.is_bought ? (a.bought_at ?? '') : a.created_at
  const kb = b.is_bought ? (b.bought_at ?? '') : b.created_at
  return ka.localeCompare(kb)
}

export default function ShoppingPage() {
  const { items, status, error, offline, pendingCount, lastRemoved, add, toggle, remove, undo, clearBought, reload } =
    useShoppingList()
  const members = useMembers()
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const groups = useMemo(
    () =>
      CATEGORIES.map((c) => ({ ...c, items: items.filter((i) => i.category === c.id).sort(compareItems) })).filter(
        (g) => g.items.length > 0,
      ),
    [items],
  )
  const boughtCount = items.filter((i) => i.is_bought).length
  const toBuyCount = items.length - boughtCount

  function confirmClear() {
    if (window.confirm(`Usunąć z listy kupione produkty (${boughtCount})?`)) clearBought()
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 bg-stone-100 p-3 shadow-[0_6px_6px_-6px_rgba(0,0,0,0.15)]">
        <AddItemForm onAdd={add} />
        {offline && (
          <p role="status" className="mt-2 rounded-xl bg-amber-100 p-3 font-medium text-amber-900">
            Brak internetu — lista z pamięci telefonu. Zmiany wyślą się same
            {pendingCount > 0 && <> (czeka: {pendingCount})</>}.
          </p>
        )}
        {error && (
          <div className="mt-2">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        )}
      </div>

      {status === 'loading' && <Spinner />}

      {status === 'error' && (
        <div className="space-y-3 p-4">
          <ErrorMessage>Nie udało się wczytać listy. Sprawdź internet.</ErrorMessage>
          <Button onClick={reload}>Spróbuj ponownie</Button>
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div className="px-6 py-12 text-center text-stone-500">
          <p className="text-xl font-medium">Lista jest pusta</p>
          <p className="mt-2 text-lg">Wpisz pierwszy produkt u góry.</p>
        </div>
      )}

      {status === 'ready' && items.length > 0 && (
        <div className="space-y-4 px-3 pt-1">
          <p className="px-1 text-stone-600">
            Do kupienia: <strong>{toBuyCount}</strong>
            {boughtCount > 0 && <> · kupione: {boughtCount}</>}
          </p>

          {groups.map((g) => (
            <section key={g.id}>
              <h2 className="mb-1 px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">{g.label}</h2>
              <ul className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {g.items.map((item) => {
                  const author = item.added_by ? memberById.get(item.added_by) : undefined
                  return (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      color={author?.color}
                      addedByName={author?.display_name}
                      onToggle={() => toggle(item)}
                      onRemove={() => remove(item)}
                    />
                  )
                })}
              </ul>
            </section>
          ))}

          {boughtCount > 0 && (
            <Button variant="secondary" onClick={confirmClear}>
              Wyczyść kupione ({boughtCount})
            </Button>
          )}
        </div>
      )}

      {lastRemoved && (
        <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-2xl bg-stone-800 py-2 pr-2 pl-4 text-white shadow-lg">
          <span className="flex-1 truncate">Usunięto „{lastRemoved.name}”</span>
          <button onClick={undo} className="min-h-12 rounded-xl px-4 font-semibold text-brand-100 active:bg-white/10">
            Cofnij
          </button>
        </div>
      )}
    </div>
  )
}
