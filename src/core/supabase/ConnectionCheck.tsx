import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './client'

type Status = 'checking' | 'ok' | 'no-config' | 'no-migration' | 'error'

const messages: Record<Status, string> = {
  checking: 'Sprawdzam połączenie z bazą…',
  ok: 'Połączono z bazą. Tabele są na miejscu i zabezpieczone. ✓',
  'no-config': 'Brak kluczy Supabase w pliku .env.',
  'no-migration': 'Połączono, ale baza jest pusta — wgraj migrację 0001_init.sql.',
  error: 'Nie udało się połączyć z bazą.',
}

/**
 * Tymczasowy test połączenia (krok 2). Zniknie w kroku 3, gdy dojdzie logowanie.
 * Niezalogowany użytkownik powinien dostać „brak uprawnień” — to znaczy, że tabela
 * istnieje, a zabezpieczenia działają.
 */
export function ConnectionCheck() {
  const [status, setStatus] = useState<Status>(isSupabaseConfigured ? 'checking' : 'no-config')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase
      .from('shopping_items')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        if (!error || error.code === '42501') setStatus('ok')
        else if (error.code === 'PGRST205' || error.code === '42P01') setStatus('no-migration')
        else {
          setStatus('error')
          setDetail(`${error.code ?? ''} ${error.message}`)
        }
      })
  }, [])

  const color = status === 'ok' ? 'bg-brand-100 text-brand-800' : status === 'checking' ? 'bg-stone-200' : 'bg-red-100 text-red-800'
  return (
    <div className={`mt-4 rounded-2xl p-4 ${color}`}>
      <p className="font-medium">{messages[status]}</p>
      {detail && <p className="mt-1 text-sm">{detail}</p>}
    </div>
  )
}
