import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { clearAppData, readJSON, writeJSON } from '../storage'
import { supabase } from '../supabase/client'
import type { Household, Profile } from '../supabase/database.types'
import { AuthContext, type AuthState } from './authContext'

/** Profil i dom wczytane dla konkretnej osoby (userId). */
type Loaded = {
  userId: string
  ok: boolean
  profile: Profile | null
  household: Household | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  // Sesja: odczyt z pamięci telefonu + nasłuch zmian (logowanie, wylogowanie, odświeżenie tokenu).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoaded(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setSessionLoaded(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  const load = useCallback(async () => {
    if (!userId) return
    const cacheKey = `auth:${userId}`
    // Bez internetu: używamy ostatnio zapamiętanego profilu i domu.
    const fail = () => {
      const cached = readJSON<{ profile: Profile; household: Household | null }>(cacheKey)
      setLoaded(cached ? { userId, ok: true, ...cached } : { userId, ok: false, profile: null, household: null })
    }
    const p = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (p.error) return fail()
    let household: Household | null = null
    if (p.data.household_id) {
      const h = await supabase.from('households').select('*').eq('id', p.data.household_id).single()
      if (h.error) return fail()
      household = h.data
    }
    writeJSON(cacheKey, { profile: p.data, household })
    setLoaded({ userId, ok: true, profile: p.data, household })
  }, [userId])

  // Pobranie profilu z bazy po zmianie osoby. Stan ustawia się dopiero po odpowiedzi.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    load()
    // Po powrocie internetu odśwież dane (mogły być z pamięci telefonu).
    window.addEventListener('online', load)
    return () => window.removeEventListener('online', load)
  }, [load])

  const signOut = useCallback(async () => {
    // 'local' = wyloguj tylko ten telefon, nie wszystkie urządzenia tej osoby.
    clearAppData()
    await supabase.auth.signOut({ scope: 'local' })
  }, [])

  const retry = useCallback(async () => {
    setLoaded(null) // pokaż ładowanie
    await load()
  }, [load])

  const value = useMemo<AuthState>(() => {
    const current = loaded && loaded.userId === userId ? loaded : null
    let status: AuthState['status']
    if (!sessionLoaded) status = 'loading'
    else if (!session) status = 'signed-out'
    else if (!current) status = 'loading'
    else if (!current.ok) status = 'error'
    else status = 'ready'
    return {
      status,
      session,
      profile: current?.profile ?? null,
      household: current?.household ?? null,
      refresh: current?.ok ? load : retry,
      signOut,
    }
  }, [sessionLoaded, session, userId, loaded, load, retry, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
