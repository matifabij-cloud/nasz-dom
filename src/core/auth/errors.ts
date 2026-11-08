/** Zamienia błędy Supabase na proste komunikaty po polsku. */
export function polishError(e: unknown): string {
  const err = (e ?? {}) as { code?: string; message?: string; status?: number }
  const code = err.code ?? ''
  const msg = err.message ?? ''

  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'Zły e-mail lub hasło.'
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(msg))
    return 'Ten e-mail ma już konto. Zaloguj się.'
  if (code === 'weak_password' || /password should/i.test(msg)) return 'Hasło jest za krótkie — wpisz co najmniej 6 znaków.'
  if (code === 'email_address_invalid' || /email.*invalid|invalid.*email/i.test(msg))
    return 'Ten adres e-mail wygląda na błędny.'
  if (code.startsWith('over_') || err.status === 429) return 'Za dużo prób. Odczekaj chwilę i spróbuj ponownie.'
  if (/failed to fetch|load failed|network/i.test(msg)) return 'Brak połączenia z internetem.'
  // Komunikaty z naszych funkcji w bazie są już po polsku.
  if (/^(Należysz już|Nie ma domu|Musisz być)/.test(msg)) return msg
  return 'Coś poszło nie tak. Spróbuj ponownie.'
}
