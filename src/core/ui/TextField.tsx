import { useId, useState, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string }

const inputClass =
  'block min-h-14 w-full rounded-2xl border-2 border-stone-300 bg-white px-4 text-lg outline-none focus:border-brand-600'

export function TextField({ label, id, className = '', ...rest }: Props) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block font-medium text-stone-700">
        {label}
      </label>
      <input id={inputId} className={`${inputClass} ${className}`} {...rest} />
    </div>
  )
}

/** Pole hasła z przyciskiem „Pokaż” — łatwiej wpisać bez pomyłki. */
export function PasswordField({ label, id, ...rest }: Omit<Props, 'type'>) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block font-medium text-stone-700">
        {label}
      </label>
      <div className="relative">
        <input id={inputId} type={visible ? 'text' : 'password'} className={`${inputClass} pr-24`} {...rest} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 px-4 font-medium text-brand-700"
        >
          {visible ? 'Ukryj' : 'Pokaż'}
        </button>
      </div>
    </div>
  )
}
