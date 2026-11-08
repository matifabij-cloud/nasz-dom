import { useState } from 'react'
import { APP_NAME } from '../config'
import { Button } from '../ui/Button'

/** Kod zaproszenia dużymi literami + „Wyślij kod rodzinie” (SMS, WhatsApp, Messenger…). */
export function InviteCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const text =
    `Dołącz do naszego domu w apce ${APP_NAME}!\n` +
    `1. Otwórz: ${window.location.origin}\n` +
    `2. Załóż konto\n` +
    `3. Wpisz kod: ${code}`

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Brak schowka — kod i tak widać na ekranie.
    }
  }

  return (
    <div>
      <div className="rounded-2xl border-2 border-dashed border-brand-600 bg-brand-50 p-4 text-center">
        <p className="text-stone-600">Kod zaproszenia</p>
        <p className="mt-1 font-mono text-4xl font-bold tracking-[0.25em] text-brand-800 select-all">{code}</p>
      </div>
      <Button className="mt-3" onClick={share}>
        {copied ? 'Skopiowano — wklej w wiadomości ✓' : 'Wyślij kod rodzinie'}
      </Button>
    </div>
  )
}
