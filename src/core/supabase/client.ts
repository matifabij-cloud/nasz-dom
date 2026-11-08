import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** false = brak kluczy w .env (apka pokaże komunikat zamiast się wysypać). */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient<Database>(
  url || 'http://localhost:54321',
  anonKey || 'brak-klucza',
  {
    global: {
      // Zapisy (dodanie, odhaczenie, usunięcie) mają dojść do bazy nawet wtedy,
      // gdy ktoś od razu zamknie apkę — przeglądarka dokończy je w tle.
      fetch: (input, init) =>
        fetch(input, init?.method && init.method !== 'GET' ? { ...init, keepalive: true } : init),
    },
    auth: {
      // Sesja zapamiętana na stałe i odświeżana w tle — bez ponownego logowania.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)
