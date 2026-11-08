import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { supabase } from '../supabase/client'
import { Button } from '../ui/Button'
import { buttonClass } from '../ui/buttonStyles'
import { ErrorMessage } from '../ui/ErrorMessage'
import { FullScreen } from '../ui/FullScreen'
import { PasswordField, TextField } from '../ui/TextField'
import { polishError } from './errors'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(polishError(error))
  }

  return (
    <FullScreen title="Logowanie">
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="Hasło"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <Button type="submit" loading={busy}>Zaloguj</Button>
      </form>

      <div className="mt-6 border-t border-stone-200 pt-5">
        <p className="mb-3 text-center text-stone-600">Pierwszy raz tutaj?</p>
        <Link to="/rejestracja" className={buttonClass('secondary')}>Załóż konto</Link>
      </div>
    </FullScreen>
  )
}
