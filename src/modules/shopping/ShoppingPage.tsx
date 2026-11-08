import { useCallback, useMemo } from 'react'
import { useMembers } from '../../core/household/useMembers'
import type { ShoppingItem } from '../../core/supabase/database.types'
import { Button } from '../../core/ui/Button'
import { ErrorMessage } from '../../core/ui/ErrorMessage'
import { OfflineBanner } from '../../core/ui/OfflineBanner'
import { QuickAddForm } from '../../core/ui/QuickAddForm'
import { Spinner } from '../../core/ui/Spinner'
import { CATEGORIES, normalize } from './categories'
import { buildSuggestions, learnStoreOrder, matchSuggestions, MIN_TRIPS, type HistoryRow, type StoreOrder } from './history'
import { ShoppingItemRow } from './ShoppingItemRow'
import { useShoppingHistory } from './useShoppingHistory'
import { useShoppingList } from './useShoppingList'

const time = (iso: string | null) => (iso ? Date.parse(iso) : 0)

/**
 * Niekupione na górze, kupione na dole działu (w kolejności kupowania).
 * Gdy apka zna Wasz sklep — niekupione w kolejności trasy przez sklep.
 */
function compareItems(order: StoreOrder | null) {
  const pos = (i: ShoppingItem) => order?.item.get(normalize(i.name)) ?? order?.category.get(i.category) ?? 0.5
  return (a: ShoppingItem, b: ShoppingItem) => {
    if (a.is_bought !== b.is_bought) return a.is_bought ? 1 : -1
    if (a.is_bought) return time(a.bought_at) - time(b.bought_at)
    if (order) {
      const d = pos(a) - pos(b)
      if (Math.abs(d) > 0.001) return d
    }
    return time(a.created_at) - time(b.created_at)
  }
}

export default function ShoppingPage() {
  const { items, status, error, offline, pendingCount, lastRemoved, add, toggle, remove, undo, clearBought, reload } =
    useShoppingList()
  const members = useMembers()
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const { history, remember } = useShoppingHistory()

  // Historia + to, co jest teraz na liście (bieżące zakupy też uczą).
  const allRows = useMemo<HistoryRow[]>(() => {
    const ids = new Set(history.map((h) => h.id))
    return [...history, ...items.filter((i) => !ids.has(i.id))]
  }, [history, items])

  const learned = useMemo(() => {
    const order = learnStoreOrder(allRows)
    return order.trips >= MIN_TRIPS ? order : null
  }, [allRows])

  const suggestions = useMemo(() => buildSuggestions(allRows), [allRows])
  const onList = useMemo(() => new Set(items.filter((i) => !i.is_bought).map((i) => normalize(i.name))), [items])
  const suggest = useCallback((q: string) => matchSuggestions(suggestions, q, onList), [suggestions, onList])

  const groups = useMemo(() => {
    const cmp = compareItems(learned)
    const catPos = (id: (typeof CATEGORIES)[number]['id'], idx: number) =>
      learned?.category.get(id) ?? idx / (CATEGORIES.length - 1)
    return CATEGORIES.map((c, idx) => ({ ...c, pos: catPos(c.id, idx), items: items.filter((i) => i.category === c.id).sort(cmp) }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.pos - b.pos)
  }, [items, learned])
  const boughtCount = items.filter((i) => i.is_bought).length
  const toBuyCount = items.length - boughtCount

  function confirmClear() {
    if (!window.confirm(`Wyczyścić z listy kupione produkty (${boughtCount})?`)) return
    remember(items.filter((i) => i.is_bought)) // kupione zostają w historii — apka się z nich uczy
    clearBought()
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 bg-stone-100 p-3 shadow-[0_6px_6px_-6px_rgba(0,0,0,0.15)]">
        <QuickAddForm onAdd={add} placeholder="Co kupić?" suggest={suggest} />
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
          {learned && <p className="-mt-3 px-1 text-sm text-stone-500">Ułożone według kolejności w Waszym sklepie</p>}

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
