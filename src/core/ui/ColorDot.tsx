/** Kropka w kolorze domownika. */
export function ColorDot({ color, className = 'size-3' }: { color?: string; className?: string }) {
  if (!color) return null
  return <span className={`inline-block shrink-0 rounded-full ${className}`} style={{ backgroundColor: color }} aria-hidden="true" />
}
