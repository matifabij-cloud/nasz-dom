/** Żółty komunikat „brak internetu” — wspólny dla wszystkich modułów. */
export function OfflineBanner({ offline, pendingCount }: { offline: boolean; pendingCount: number }) {
  if (!offline) return null
  return (
    <p role="status" className="mt-2 rounded-xl bg-amber-100 p-3 font-medium text-amber-900">
      Brak internetu — dane z pamięci telefonu. Zmiany wyślą się same
      {pendingCount > 0 && <> (czeka: {pendingCount})</>}.
    </p>
  )
}
