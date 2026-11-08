/**
 * Pamięć telefonu (localStorage) — dane do pracy bez internetu.
 * Wszystkie klucze apki zaczynają się od „nasz-dom:”.
 */
const PREFIX = 'nasz-dom:'

export function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Brak miejsca / tryb prywatny — apka działa dalej, tylko bez pamięci offline.
  }
}

/** Czyści dane apki (przy wylogowaniu), nie ruszając sesji Supabase. */
export function clearAppData() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignoruj
  }
}

/** Czy błąd z Supabase to brak internetu / chwilowy problem (warto spróbować ponownie)? */
export function isRetryable(error: { code?: string; status?: number } | null | undefined, status?: number) {
  if (!error) return false
  const s = status ?? error.status ?? 0
  if (!error.code || s === 0) return true // brak sieci
  if (s === 401 || error.code === 'PGRST301' || error.code === 'PGRST303') return true // wygasły token
  return s >= 500
}
