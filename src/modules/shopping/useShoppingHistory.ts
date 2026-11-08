import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../core/auth/authContext'
import { readJSON, writeJSON } from '../../core/storage'
import { supabase } from '../../core/supabase/client'
import type { HistoryRow } from './history'

const HISTORY_DAYS = 180

/** Historia zakupów domu z ostatniego pół roku (zapamiętana też na telefonie). */
export function useShoppingHistory() {
  const { household } = useAuth()
  const cacheKey = `shopping:${household?.id}:history`
  const [history, setHistory] = useState<HistoryRow[]>(() => readJSON<HistoryRow[]>(cacheKey) ?? [])

  const refresh = useCallback(async () => {
    if (!household) return
    const since = new Date(Date.now() - HISTORY_DAYS * 24 * 3600 * 1000).toISOString()
    const { data, error } = await supabase
      .from('shopping_items')
      .select('id, name, category, created_at, is_bought, bought_at, bought_by')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(3000)
    if (error || !data) return // bez internetu zostaje historia z pamięci telefonu
    setHistory(data)
    writeJSON(cacheKey, data)
  }, [household, cacheKey])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- pobranie z bazy; stan ustawia się po odpowiedzi
    refresh()
  }, [refresh])

  return history
}
