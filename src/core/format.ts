const dayMonth = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' })

/** „dziś”, „wczoraj”, „przedwczoraj” albo „5 lis”. */
export function relativeDay(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(new Date()) - startOf(date)) / 86_400_000)
  if (days <= 0) return 'dziś'
  if (days === 1) return 'wczoraj'
  if (days === 2) return 'przedwczoraj'
  return dayMonth.format(date)
}
