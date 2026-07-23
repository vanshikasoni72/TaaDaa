interface CheckboxProps {
  checked: boolean
  onChange: () => void
  label: string
}

export function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`group relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
        checked ? 'animate-check-pop border-rose bg-rose/20' : 'border-ink/30 hover:border-raspberry dark:border-ink-dark/30'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 overflow-visible"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M4 12.6 Q6.3 14.3 9.4 17.9 Q14.5 11.3 20 4.7 Q20.6 4.4 20.1 5.6"
          className="text-rose"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: checked ? 0 : 1,
            transition: 'stroke-dashoffset 300ms ease-out',
          }}
        />
      </svg>
    </button>
  )
}
