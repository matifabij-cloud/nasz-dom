const variants = {
  primary: 'bg-brand-700 text-white active:bg-brand-800',
  secondary: 'border-2 border-stone-300 bg-white text-stone-900 active:bg-stone-100',
  danger: 'border-2 border-red-200 bg-white text-red-700 active:bg-red-50',
}

export type ButtonVariant = keyof typeof variants

/** Klasy dużego przycisku — także dla linków, które mają wyglądać jak przycisk. */
export function buttonClass(variant: ButtonVariant = 'primary') {
  return `flex min-h-14 w-full items-center justify-center rounded-2xl px-5 text-lg font-semibold disabled:opacity-60 ${variants[variant]}`
}
