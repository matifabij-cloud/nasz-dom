import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '../auth/authContext'
import { polishError } from '../auth/errors'
import { supabase } from '../supabase/client'
import type { Household } from '../supabase/database.types'
import { Button } from '../ui/Button'
import { ErrorMessage } from '../ui/ErrorMessage'
import { FullScreen } from '../ui/FullScreen'
import { TextField } from '../ui/TextField'
import { InviteCodeCard } from './InviteCodeCard'

type Mode = 'choose' | 'join' | 'create'

/** Po rejestracji: dołącz kodem albo załóż nowy dom. */
export function HouseholdSetupPage() {
  const { profile, household, refresh, signOut } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('choose')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Household | null>(null)

  if (household && !created) return <Navigate to="/" replace />

  function go(next: Mode) {
    setError('')
    setMode(next)
  }

  async function join(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.rpc('join_household', { p_code: code })
    if (error) {
      setBusy(false)
      setError(polishError(error))
      return
    }
    await refresh() // dom się pojawi → przekierowanie na listę
  }

  async function create(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { data, error } = await supabase.rpc('create_household', { p_name: name.trim() })
    setBusy(false)
    if (error) setError(polishError(error))
    else setCreated(data)
  }

  async function finish() {
    setBusy(true)
    await refresh()
    navigate('/', { replace: true })
  }

  if (created) {
    return (
      <FullScreen title="Dom założony!">
        <p className="mb-4 text-lg text-stone-700">
          Wyślij ten kod rodzinie. Wpiszą go po założeniu swojego konta.
        </p>
        <InviteCodeCard code={created.invite_code} />
        <p className="mt-3 text-center text-stone-500">Kod znajdziesz później pod ikonką domku u góry.</p>
        <Button variant="secondary" className="mt-5" loading={busy} onClick={finish}>
          Przejdź do listy zakupów
        </Button>
      </FullScreen>
    )
  }

  if (mode === 'join') {
    return (
      <FullScreen title="Dołącz do rodziny">
        <form onSubmit={join} className="space-y-4">
          <TextField
            label="Kod od rodziny (6 znaków)"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={10}
            required
            className="text-center font-mono text-2xl tracking-[0.25em] uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Button type="submit" loading={busy}>Dołącz</Button>
          <Button type="button" variant="secondary" onClick={() => go('choose')}>Wstecz</Button>
        </form>
      </FullScreen>
    )
  }

  if (mode === 'create') {
    return (
      <FullScreen title="Nowy dom">
        <form onSubmit={create} className="space-y-4">
          <TextField
            label="Nazwa domu"
            placeholder="np. Dom Kowalskich"
            maxLength={60}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Button type="submit" loading={busy}>Załóż dom</Button>
          <Button type="button" variant="secondary" onClick={() => go('choose')}>Wstecz</Button>
        </form>
      </FullScreen>
    )
  }

  return (
    <FullScreen title={`Cześć, ${profile?.display_name ?? ''}!`}>
      <p className="mb-5 text-lg text-stone-700">Dołącz do rodziny albo załóż nowy dom.</p>
      <div className="space-y-3">
        <Button onClick={() => go('join')}>Mam kod od rodziny</Button>
        <Button variant="secondary" onClick={() => go('create')}>Zakładam nowy dom</Button>
      </div>
      <button onClick={signOut} className="mt-6 w-full py-2 text-center text-stone-500 underline">
        Wyloguj
      </button>
    </FullScreen>
  )
}
