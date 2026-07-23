import { forwardRef, useMemo, useState } from 'react'
import { parseQuickAdd, type QuickAddSubmission } from '../lib/parseQuickAdd'
import { colorForTag } from '../lib/tags'
import { describeRecurrence } from '../lib/recurrence'
import { CalendarIcon, ClockIcon, FlagIcon, BellIcon, PaperclipIcon, FolderIcon } from './icons'
import type { Priority, Project, ReminderRule } from '../types'

interface QuickAddProps {
  projects: Project[]
  existingTags?: string[]
  onAdd: (input: QuickAddSubmission) => void
  /** Fires instead of onAdd when the input is exactly "snake" or "tetris" — the easter-egg game trigger. */
  onCommand?: (cmd: 'snake' | 'tetris') => void
}

type Popover = 'date' | 'time' | 'priority' | 'reminder' | 'note' | 'project' | null

const REMINDER_PRESETS: { label: string; leadMinutes: number }[] = [
  { label: 'at due time', leadMinutes: 0 },
  { label: '1 hour before', leadMinutes: 60 },
  { label: '1 day before', leadMinutes: 60 * 24 },
  { label: '1 week before', leadMinutes: 60 * 24 * 7 },
]

function toolbarBtnClass(active: boolean) {
  return `flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 ${
    active
      ? 'bg-raspberry/15 text-raspberry'
      : 'text-ink/35 hover:bg-ink/5 hover:text-ink/60 dark:text-ink-dark/35 dark:hover:bg-white/5'
  }`
}

const fieldClass =
  'w-full rounded-lg border border-ink/10 bg-white/60 px-2 py-1.5 text-sm text-ink outline-none focus:border-raspberry/40 dark:border-border dark:bg-transparent dark:text-ink-dark'

export const QuickAdd = forwardRef<HTMLInputElement, QuickAddProps>(function QuickAdd(
  { projects, existingTags = [], onAdd, onCommand },
  ref,
) {
  const [value, setValue] = useState('')
  const [popover, setPopover] = useState<Popover>(null)
  const [tagActiveIndex, setTagActiveIndex] = useState(0)
  const [dismissedTagQuery, setDismissedTagQuery] = useState<string | null>(null)
  const [manualDate, setManualDate] = useState<string | null>(null)
  const [manualDueDate, setManualDueDate] = useState<string | null>(null)
  const [manualTime, setManualTime] = useState<string | null>(null)
  const [manualProjectId, setManualProjectId] = useState<string | null>(null)
  const [manualPriority, setManualPriority] = useState<Priority | null>(null)
  const [manualReminders, setManualReminders] = useState<ReminderRule[]>([])
  const [manualNote, setManualNote] = useState<string | null>(null)

  const preview = useMemo(() => (value.trim() ? parseQuickAdd(value) : null), [value])

  // Tag autocomplete: a trailing "#partial" at the end of the input opens a
  // dropdown of already-used tags (plus the built-in defaults) that match as
  // a prefix. Deliberately end-of-string only, matching how the rest of
  // quick-add's parsing already isn't caret-position-aware.
  const tagMatch = /#([a-zA-Z0-9_-]*)$/.exec(value)
  const tagQuery = tagMatch ? tagMatch[1].toLowerCase() : null
  const tagSuggestions =
    tagQuery !== null
      ? existingTags.filter((t) => t.toLowerCase().startsWith(tagQuery) && t.toLowerCase() !== tagQuery).slice(0, 6)
      : []
  const showTagDropdown = tagQuery !== null && tagQuery !== dismissedTagQuery && tagSuggestions.length > 0
  const clampedTagIndex = Math.min(tagActiveIndex, Math.max(tagSuggestions.length - 1, 0))

  function selectTagSuggestion(tag: string) {
    if (!tagMatch) return
    const start = value.length - tagMatch[0].length
    setValue(`${value.slice(0, start)}#${tag} `)
    setTagActiveIndex(0)
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showTagDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setTagActiveIndex((i) => (i + 1) % tagSuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setTagActiveIndex((i) => (i - 1 + tagSuggestions.length) % tagSuggestions.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      selectTagSuggestion(tagSuggestions[clampedTagIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDismissedTagQuery(tagQuery)
    }
  }

  function togglePopover(p: Popover) {
    setPopover((prev) => (prev === p ? null : p))
  }

  function toggleReminder(leadMinutes: number) {
    setManualReminders((prev) => {
      const has = prev.some((r) => r.leadMinutes === leadMinutes)
      if (has) return prev.filter((r) => r.leadMinutes !== leadMinutes)
      if (prev.length >= 3) return prev
      return [...prev, { leadMinutes }].sort((a, b) => a.leadMinutes - b.leadMinutes)
    })
  }

  function resetToolbar() {
    setManualDate(null)
    setManualDueDate(null)
    setManualTime(null)
    setManualProjectId(null)
    setManualPriority(null)
    setManualReminders([])
    setManualNote(null)
    setPopover(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = value.toLowerCase().trim()
    if ((normalized === 'snake' || normalized === 'tetris') && onCommand) {
      onCommand(normalized)
      setValue('')
      resetToolbar()
      return
    }
    if (!preview || !preview.title) return
    onAdd({
      ...preview,
      date: manualDate ?? preview.date,
      dueDate: manualDueDate ?? preview.dueDate,
      time: manualTime,
      projectId: manualProjectId,
      priority: manualPriority,
      reminders: manualReminders,
      note: manualNote,
    })
    setValue('')
    resetToolbar()
  }

  const effectiveDate = manualDate ?? preview?.date ?? null
  const hasProject = manualProjectId !== null || Boolean(preview?.projectPath)

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setTagActiveIndex(0)
        }}
        onKeyDown={handleInputKeyDown}
        placeholder="Add a task…"
        autoComplete="off"
        role="combobox"
        aria-expanded={showTagDropdown}
        aria-autocomplete="list"
        className="w-full rounded-2xl border border-quickadd-border bg-quickadd px-4 py-3.5 text-base text-ink placeholder:text-ink/35 shadow-sm outline-none transition-shadow duration-150 focus:border-raspberry/40 focus:ring-2 focus:ring-raspberry/25 dark:text-ink-dark dark:placeholder:text-ink-dark/35 dark:focus:shadow-[0_0_15px_rgba(214,60,122,0.25)]"
      />

      {showTagDropdown && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-48 overflow-hidden rounded-xl border border-ink/10 bg-white/95 py-1 shadow-lg backdrop-blur-sm dark:border-white/[0.08] dark:bg-cream-dark/90 dark:backdrop-blur-lg">
          {tagSuggestions.map((tag, i) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                selectTagSuggestion(tag)
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors duration-150 ${
                i === clampedTagIndex
                  ? 'bg-raspberry/15 text-raspberry dark:bg-raspberry/20 dark:text-raspberry'
                  : 'text-ink/70 dark:text-ink-dark/70'
              }`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: colorForTag(tag) }} />
              #{tag}
            </button>
          ))}
        </div>
      )}

      {preview &&
        (preview.date || preview.dueDate || preview.projectPath || preview.tags.length > 0 || preview.recurrence) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
          {preview.date && !manualDate && (
            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/60 dark:bg-white/10 dark:text-ink-dark/60">
              {preview.date}
            </span>
          )}
          {(manualDueDate ?? preview.dueDate) && (
            <span className="rounded-full bg-magenta/15 px-2 py-0.5 text-xs font-medium text-magenta">
              due {manualDueDate ?? preview.dueDate}
            </span>
          )}
          {preview.recurrence && (
            <span className="flex items-center gap-1 text-xs text-ink/60 dark:text-ink-dark/60">
              ↻ {describeRecurrence(preview.recurrence)}
            </span>
          )}
          {preview.projectPath && !manualProjectId && (
            <span className="rounded-full bg-raspberry/10 px-2 py-0.5 text-xs font-medium text-raspberry">
              @{preview.projectPath}
            </span>
          )}
          {preview.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 text-xs text-ink/60 dark:text-ink-dark/60"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: colorForTag(tag) }}
              />
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1 px-0.5">
        <button type="button" onClick={() => togglePopover('project')} className={toolbarBtnClass(hasProject)} aria-label="Project">
          <FolderIcon />
        </button>
        <button
          type="button"
          onClick={() => togglePopover('date')}
          className={toolbarBtnClass(Boolean(effectiveDate) || Boolean(manualDueDate ?? preview?.dueDate))}
          aria-label="Dates"
        >
          <CalendarIcon />
        </button>
        <button type="button" onClick={() => togglePopover('time')} className={toolbarBtnClass(Boolean(manualTime))} aria-label="Time">
          <ClockIcon />
        </button>
        <button type="button" onClick={() => togglePopover('priority')} className={toolbarBtnClass(Boolean(manualPriority))} aria-label="Priority">
          <FlagIcon />
        </button>
        <button type="button" onClick={() => togglePopover('reminder')} className={toolbarBtnClass(manualReminders.length > 0)} aria-label="Reminders">
          <BellIcon />
        </button>
        <button type="button" onClick={() => togglePopover('note')} className={toolbarBtnClass(Boolean(manualNote))} aria-label="Note or link">
          <PaperclipIcon />
        </button>
        <button
          type="submit"
          aria-label="Add task"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-raspberry text-cream transition-colors duration-150 hover:bg-raspberry/90"
        >
          +
        </button>
      </div>

      {popover && (
        <div className="mt-2 rounded-xl border border-ink/10 bg-white/60 p-3 dark:border-border dark:bg-white/5">
          {popover === 'project' && (
            <select
              value={manualProjectId ?? '__none__'}
              onChange={(e) => setManualProjectId(e.target.value === '__none__' ? null : e.target.value)}
              className={fieldClass}
            >
              <option value="__none__">use @project typed above, or none</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.parentId ? `${projects.find((pp) => pp.id === p.parentId)?.name} / ${p.name}` : p.name}
                </option>
              ))}
            </select>
          )}

          {popover === 'date' && (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-ink/40 dark:text-ink-dark/40">
                  Work on
                </span>
                <input
                  type="date"
                  value={manualDate ?? ''}
                  onChange={(e) => setManualDate(e.target.value || null)}
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-ink/40 dark:text-ink-dark/40">
                  Due date
                </span>
                <input
                  type="date"
                  value={manualDueDate ?? ''}
                  onChange={(e) => setManualDueDate(e.target.value || null)}
                  className={fieldClass}
                />
              </label>
            </div>
          )}

          {popover === 'time' && (
            <input
              type="time"
              value={manualTime ?? ''}
              onChange={(e) => setManualTime(e.target.value || null)}
              className={fieldClass}
            />
          )}

          {popover === 'priority' && (
            <div className="flex gap-2">
              {([null, 1, 2, 3] as (Priority | null)[]).map((p) => (
                <button
                  key={String(p)}
                  type="button"
                  onClick={() => setManualPriority(p)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-sm transition-colors duration-150 ${
                    manualPriority === p
                      ? 'border-raspberry bg-raspberry/10 text-raspberry'
                      : 'border-ink/10 text-ink/50 hover:border-ink/20 dark:border-border dark:text-ink-dark/50'
                  }`}
                >
                  {p === null ? 'none' : `⚑ ${p}`}
                </button>
              ))}
            </div>
          )}

          {popover === 'reminder' && (
            <div className="flex flex-wrap gap-2">
              {REMINDER_PRESETS.map((preset) => {
                const active = manualReminders.some((r) => r.leadMinutes === preset.leadMinutes)
                return (
                  <button
                    key={preset.leadMinutes}
                    type="button"
                    onClick={() => toggleReminder(preset.leadMinutes)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${
                      active
                        ? 'border-raspberry bg-raspberry/10 text-raspberry'
                        : 'border-ink/10 text-ink/50 hover:border-ink/20 dark:border-border dark:text-ink-dark/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          )}

          {popover === 'note' && (
            <input
              type="text"
              value={manualNote ?? ''}
              onChange={(e) => setManualNote(e.target.value || null)}
              placeholder="anything worth attaching"
              className={fieldClass}
            />
          )}
        </div>
      )}
    </form>
  )
})
