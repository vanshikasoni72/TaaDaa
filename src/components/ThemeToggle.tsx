import type { ThemePref } from '../lib/theme'

interface ThemeToggleProps {
  pref: ThemePref
  onChange: (pref: ThemePref) => void
}

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'auto' },
  { value: 'light', label: 'light' },
  { value: 'dark', label: 'dark' },
]

export function ThemeToggle({ pref, onChange }: ThemeToggleProps) {
  return (
    <div className="flex gap-2 text-xs">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`transition-colors duration-300 ${
            pref === o.value
              ? 'font-semibold text-raspberry'
              : 'text-ink/40 hover:text-ink/70 dark:text-ink-dark/40 dark:hover:text-ink-dark/70'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
