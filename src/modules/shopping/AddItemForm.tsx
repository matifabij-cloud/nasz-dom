import { useRef, useState, type FormEvent } from 'react'

/** Pole „Co kupić?” — Enter albo „Dodaj”, a pole od razu gotowe na kolejny produkt. */
export function AddItemForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    onAdd(value)
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Co kupić?"
        aria-label="Co kupić?"
        maxLength={100}
        autoComplete="off"
        enterKeyHint="enter"
        className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-stone-300 bg-white px-4 text-lg outline-none focus:border-brand-600"
      />
      <button
        type="submit"
        // Nie zabieraj fokusu z pola — klawiatura zostaje otwarta.
        onPointerDown={(e) => e.preventDefault()}
        className="min-h-14 shrink-0 rounded-2xl bg-brand-700 px-5 text-lg font-semibold text-white active:bg-brand-800"
      >
        Dodaj
      </button>
    </form>
  )
}
