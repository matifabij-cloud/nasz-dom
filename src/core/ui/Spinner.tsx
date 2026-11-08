export function Spinner() {
  return (
    <div className="flex justify-center p-10" role="status" aria-label="Ładowanie">
      <div className="size-10 animate-spin rounded-full border-4 border-stone-300 border-t-brand-700" />
    </div>
  )
}
