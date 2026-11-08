import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Household, Profile } from '../supabase/database.types'

export interface AuthState {
  /** loading — wczytywanie; signed-out — brak sesji; error — nie udało się wczytać profilu; ready — gotowe. */
  status: 'loading' | 'signed-out' | 'error' | 'ready'
  session: Session | null
  profile: Profile | null
  household: Household | null
  /** Ponownie wczytuje profil i dom (np. po dołączeniu do domu). */
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth musi być użyte wewnątrz <AuthProvider>')
  return ctx
}
