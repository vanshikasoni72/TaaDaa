export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const daysSinceMonday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - daysSinceMonday)
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  return d
}

/** Full-week grid (Monday-start) covering every day of `monthDate`'s month, padded with adjacent-month days. */
export function getMonthGridDays(monthDate: Date): Date[] {
  const first = startOfMonth(monthDate)
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  const gridStart = startOfWeek(first)
  const gridEnd = addDays(startOfWeek(last), 6)

  const days: Date[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
    days.push(d)
  }
  return days
}

export function formatWeekRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth()
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString(
    undefined,
    sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' },
  )
  return `${startLabel} – ${endLabel}`
}
