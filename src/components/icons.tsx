interface IconProps {
  size?: number
  className?: string
}

const shared = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function BellIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...shared}>
      <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function PaperclipIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...shared}>
      <path d="M8 12.5l6.5-6.5a3 3 0 0 1 4.24 4.24L11 18a5 5 0 0 1-7.07-7.07L11.5 3.5" />
    </svg>
  )
}

export function CalendarIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...shared}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  )
}

export function ClockIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...shared}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

export function FlagIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...shared}>
      <path d="M5 3v18" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </svg>
  )
}

export function NoteIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...shared}>
      <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  )
}

export function FolderIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...shared}>
      <path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
    </svg>
  )
}

/** Drag handle — two columns of dots, the conventional ⋮⋮ grip glyph. */
export function GripIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  )
}

/** A curled, segmented tail — the Snake game trigger. Opacity fades along the segments toward the tip. */
export function SnakeIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <circle cx="6" cy="18" r="2.4" fill="currentColor" opacity="1" />
      <circle cx="6" cy="12" r="2.2" fill="currentColor" opacity="0.8" />
      <circle cx="9" cy="7.5" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="14" cy="6" r="1.8" fill="currentColor" opacity="0.42" />
      <circle cx="18.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.25" />
    </svg>
  )
}

/** A small cluster of 3-4 tetromino blocks in the three accent colors — the Tetris game trigger. */
export function TetrisIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#D63C7A" />
      <rect x="12" y="3" width="7" height="7" rx="1.5" fill="#E39BC4" />
      <rect x="3" y="12" width="7" height="7" rx="1.5" fill="#4FBDAE" />
      <rect x="12" y="12" width="7" height="7" rx="1.5" fill="#D63C7A" />
    </svg>
  )
}

export function SearchIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...shared}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function ListsIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...shared}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="m4 6 1 1 2-2" />
      <path d="m4 12 1 1 2-2" />
      <path d="m4 18 1 1 2-2" />
    </svg>
  )
}

