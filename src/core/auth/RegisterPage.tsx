import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { supabase } from '../supabase/client'
import { Button } from '../ui/Button'
import { buttonClass } from '../ui/buttonStyles'
import { ErrorMessage } from '../ui/ErrorMessage'
import { FullScreen } from '../ui/FullScreen'
import { PasswordField, TextField } from '../ui/TextField'
import { polishError } from './errors'

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Hasło jest za krótkie — wpisz co najmniej 6 znaków.')
      return
    }
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } },
    })
    setBusy(false)
    if (error) setError(polishError(error))
    // Gdyby w Supabase było włączone potwierdzanie maila — sesji jeszcze nie ma.
    else if (!data.session) setInfo('Konto założone. Sprawdź skrzynkę e-mail i kliknij link, a potem się zaloguj.')
  }

  if (info) {
    return (
      <FullScreen title="Prawie gotowe">
        <p className="mb-5 text-lg">{info}</p>
        <Link to="/logowanie" className={buttonClass('primary')}>Do logowania</Link>
      </FullScreen>
    )
  }

  return (
    <FullScreen title="Nowe konto">
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Twoje imię"
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={40}
          required
          placeholder="np. Mama"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          label="Hasło (min. 6 znaków)"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <Button type="submit" loading={busy}>Załóż konto</Button>
      </form>

      <div className="mt-6 border-t border-stone-200 pt-5">
        <p className="mb-3 text-center text-stone-600">Masz już konto?</p>
        <Link to="/logowanie" className={buttonClass('secondary')}>Zaloguj się</Link>
      </div>
    </FullScreen>
  )
}
