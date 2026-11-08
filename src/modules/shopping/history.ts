import type { ShoppingCategory } from '../../core/supabase/database.types'
import { normalize } from './categories'
import { COMMON_PRODUCTS } from './commonProducts'

/** Wiersz historii: produkt dodany kiedyś na listę (także już wyczyszczony). */
export type HistoryRow = {
  id: string
  name: string
  category: ShoppingCategory
  created_at: string
  is_bought: boolean
  bought_at: string | null
  bought_by: string | null
}

// ---------------------------------------------------------------------
// Kolejność sklepu — uczona z tego, w jakiej kolejności odhaczacie produkty.
// ---------------------------------------------------------------------

/** Przerwa dłuższa niż 30 min między odhaczeniami = nowe zakupy. */
const TRIP_GAP_MS = 30 * 60 * 1000
/** Zakupy z mniej niż 3 produktami nic nie mówią o układzie sklepu. */
const MIN_TRIP_ITEMS = 3
/** Ile zakupów potrzeba, zanim apka zacznie układać listę. */
export const MIN_TRIPS = 2

export type StoreOrder = {
  trips: number
  /** Średnie położenie produktu na trasie przez sklep: 0 = początek, 1 = koniec. */
  item: Map<string, number>
  category: Map<ShoppingCategory, number>
}

export function learnStoreOrder(rows: HistoryRow[]): StoreOrder {
  // Odhaczenia każdej osoby osobno, w kolejności czasu.
  const byPerson = new Map<string, { row: HistoryRow; t: number }[]>()
  for (const row of rows) {
    if (!row.is_bought || !row.bought_at || !row.bought_by) continue
    const list = byPerson.get(row.bought_by) ?? []
    list.push({ row, t: Date.parse(row.bought_at) })
    byPerson.set(row.bought_by, list)
  }

  // Podział na pojedyncze wyjścia do sklepu.
  const trips: HistoryRow[][] = []
  for (const list of byPerson.values()) {
    list.sort((a, b) => a.t - b.t)
    let trip: HistoryRow[] = []
    let last = -Infinity
    for (const { row, t } of list) {
      if (trip.length > 0 && t - last > TRIP_GAP_MS) {
        trips.push(trip)
        trip = []
      }
      trip.push(row)
      last = t
    }
    if (trip.length > 0) trips.push(trip)
  }

  const good = trips.filter((t) => t.length >= MIN_TRIP_ITEMS)
  const itemAcc = new Map<string, [number, number]>()
  const catAcc = new Map<ShoppingCategory, [number, number]>()
  const acc = <K>(m: Map<K, [number, number]>, key: K, value: number) => {
    const a = m.get(key) ?? [0, 0]
    a[0] += value
    a[1] += 1
    m.set(key, a)
  }
  for (const trip of good) {
    trip.forEach((row, i) => {
      const pos = i / (trip.length - 1)
      acc(itemAcc, normalize(row.name), pos)
      acc(catAcc, row.category, pos)
    })
  }
  const avg = <K>(m: Map<K, [number, number]>) => new Map([...m].map(([k, [sum, n]]) => [k, sum / n] as const))
  return { trips: good.length, item: avg(itemAcc), category: avg(catAcc) }
}

// ---------------------------------------------------------------------
// Podpowiedzi przy wpisywaniu.
// ---------------------------------------------------------------------

/** Nazwy do podpowiadania: najpierw to, co kupujecie najczęściej, potem popularne produkty. */
export function buildSuggestions(rows: HistoryRow[]): string[] {
  const seen = new Map<string, { name: string; count: number; last: number }>()
  for (const row of rows) {
    const key = normalize(row.name)
    if (!key) continue
    const t = Date.parse(row.created_at)
    const e = seen.get(key)
    if (!e) seen.set(key, { name: row.name, count: 1, last: t })
    else {
      e.count += 1
      if (t > e.last) {
        e.last = t
        e.name = row.name
      }
    }
  }
  const fromHistory = [...seen.values()].sort((a, b) => b.count - a.count || b.last - a.last).map((e) => e.name)
  const keys = new Set(seen.keys())
  return [...fromHistory, ...COMMON_PRODUCTS.filter((n) => !keys.has(normalize(n)))]
}

/** Dopasowanie do wpisywanego tekstu: początek nazwy albo początek dowolnego słowa. */
export function matchSuggestions(all: string[], query: string, exclude: Set<string>, limit = 4): string[] {
  const q = normalize(query)
  if (q.length < 2) return []
  const out: string[] = []
  for (const name of all) {
    const n = normalize(name)
    if (n === q || exclude.has(n)) continue
    if (n.startsWith(q) || n.split(' ').some((w) => w.startsWith(q))) {
      out.push(name)
      if (out.length >= limit) break
    }
  }
  return out
}
