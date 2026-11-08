import { useMemo, useRef, useState, type FormEvent } from 'react'

type Props = {
  onAdd: (name: string) => void
  /** Podpowiedzi dla wpisywanego tekstu (z historii zakupów i popularnych produktów). */
  suggest: (query: string) => string[]
}

/** Pole „Co kupić?” — Enter, „Dodaj” albo dotknięcie podpowiedzi; pole od razu gotowe na kolejny produkt. */
export function AddItemForm({ onAdd, suggest }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const matches = useMemo(() => suggest(value), [suggest, value])

  function addAndReset(name: string) {
    onAdd(name)
    setValue('')
    inputRef.current?.focus()
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (value.trim()) addAndReset(value)
  }

  return (
    <div>
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

      {matches.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-2xl bg-white shadow" aria-label="Podpowiedzi">
          {matches.map((name) => (
            <li key={name} className="border-b border-stone-100 last:border-b-0">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => addAndReset(name)}
                className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-lg active:bg-stone-100"
              >
                <span className="text-2xl leading-none font-bold text-brand-700" aria-hidden="true">+</span>
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
