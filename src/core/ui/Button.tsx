import type { ButtonHTMLAttributes } from 'react'
import { buttonClass, type ButtonVariant } from './buttonStyles'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  loading?: boolean
}

export function Button({ variant = 'primary', loading, disabled, className = '', children, ...rest }: Props) {
  return (
    <button className={`${buttonClass(variant)} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? 'Chwileczkę…' : children}
    </button>
  )
}
