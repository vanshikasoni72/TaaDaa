import { useEffect, useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'
import { sortChronological } from '../lib/sortTasks'
import {
  addDays,
  addMonths,
  fromIsoDate,
  formatWeekRange,
  getMonthGridDays,
  startOfMonth,
  startOfWeek,
  todayIso,
  toIsoDate,
} from '../lib/date'
import { useDayNotes } from '../lib/useDayNotes'
import { NoteIcon } from './icons'

type Layout = 'week' | 'month'

interface CalendarViewProps {
  tasks: Task[]
  projects: Project[]
  selected: string
  onSelectDate: (iso: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

function heatClass(count: number): string {
  // Dark mode expresses density via the 2px line under the day number
  // instead (see heatLineOpacity below), so the background wash is forced
  // flat there — light mode keeps the original wash-by-count behavior.
  if (count === 0) return 'bg-ink/5 dark:!bg-white/[0.03]'
  if (count <= 2) return 'bg-raspberry/15 dark:!bg-white/[0.03]'
  if (count <= 4) return 'bg-raspberry/30 dark:!bg-white/[0.03]'
  return 'bg-raspberry/45 dark:!bg-white/[0.03]'
}

// Automatic red flag for exam/test-sounding tasks — no tag or manual step
// required, just typing one of these words anywhere in the title. Word-bounded
// so it doesn't fire on unrelated words that merely contain one of these as a
// substring (e.g. "example" shouldn't match "exam").
const RED_FLAG_RE = /\b(exams?|quiz(?:zes)?|tests?|internals?)\b/i

function heatLineOpacity(count: number): number {
  if (count === 0) return 0
  if (count <= 2) return 0.2
  if (count <= 5) return 0.6
  return 1
}

interface DayInfo {
  date: Date
  iso: string
  dayTasks: Task[]
  tags: string[]
  inCurrentPeriod: boolean
}

interface DayCellProps {
  day: DayInfo
  isSelected: boolean
  isToday: boolean
  showWeekday: boolean
  maxTitles: number
  compact: boolean
  onSelect: () => void
}

function DayCell({ day, isSelected, isToday, showWeekday, maxTitles, compact, onSelect }: DayCellProps) {
  const sorted = sortChronological(day.dayTasks)
  const visible = sorted.slice(0, maxTitles)
  const hiddenCount = sorted.length - visible.length
  const lineOpacity = heatLineOpacity(day.dayTasks.length)
  const heavy = day.dayTasks.length >= 6

  const { setNodeRef, isOver } = useDroppable({
    id: `calendar-day-${day.iso}`,
    data: { type: 'calendar-day', dateIso: day.iso },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-stretch gap-1.5 rounded-xl px-2 py-3 text-left transition duration-300 hover:ring-1 hover:ring-ink/10 dark:hover:ring-border ${compact ? 'min-h-[92px] sm:min-h-[112px]' : 'min-h-[112px] sm:min-h-[132px]'} ${
        isSelected ? 'bg-raspberry/20 ring-2 ring-raspberry/50' : heatClass(day.dayTasks.length)
      } ${day.inCurrentPeriod ? '' : 'opacity-35'} ${isOver ? 'ring-2 ring-inset ring-raspberry' : ''}`}
    >
      {showWeekday && (
        <span className="text-center text-[10px] uppercase tracking-wide text-ink/40 dark:text-ink-dark/40">
          {day.date.toLocaleDateString(undefined, { weekday: 'short' })}
        </span>
      )}
      <span
        className={`mx-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm ${
          isToday ? 'bg-raspberry text-cream font-semibold' : 'text-ink dark:text-ink-dark'
        }`}
      >
        {day.date.getDate()}
      </span>

      {lineOpacity > 0 && (
        <span
          className="mx-auto hidden h-[2px] w-8 shrink-0 rounded-full dark:block"
          style={{
            backgroundColor: 'var(--color-raspberry)',
            opacity: lineOpacity,
            boxShadow: heavy ? '0 0 6px var(--color-raspberry)' : undefined,
          }}
        />
      )}

      <div className="mt-0.5 flex flex-col gap-0.5 overflow-hidden">
        {visible.map((task) => {
          const isDue = task.dueDate === day.iso
          const isRedFlag = RED_FLAG_RE.test(task.title)
          const isFun = task.tags.includes('fun')
          return (
            <span
              key={task.id}
              className={`truncate rounded px-1 text-[11px] leading-tight ${
                isRedFlag
                  ? 'text-red-700 ring-1 ring-inset ring-red-400 dark:text-red-300 dark:ring-red-400/70'
                  : isDue
                    ? 'text-blue-700 ring-1 ring-inset ring-blue-400 dark:text-blue-300 dark:ring-blue-400/70'
                    : isFun
                      ? 'text-raspberry ring-1 ring-inset ring-raspberry/70 dark:text-raspberry-dark dark:ring-raspberry-dark/70'
                      : 'px-0 text-ink/80 dark:text-ink-dark/80'
              }`}
            >
              {task.title}
            </span>
          )
        })}
        {hiddenCount > 0 && (
          <span className="text-[11px] text-ink/40 dark:text-ink-dark/40">+{hiddenCount} more</span>
        )}
      </div>
    </button>
  )
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarView({
  tasks,
  projects,
  selected,
  onSelectDate,
  onToggle,
  onDelete,
  onSnooze,
  onAddSubtask,
  onEditTask,
}: CalendarViewProps) {
  const today = todayIso()
  const [layout, setLayout] = useState<Layout>('week')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))
  const [noteOpen, setNoteOpen] = useState(false)
  const { notes, setNoteForDay } = useDayNotes()

  useEffect(() => {
    setNoteOpen(false)
  }, [selected])

  const dates = useMemo(() => {
    return layout === 'week'
      ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      : getMonthGridDays(monthAnchor)
  }, [layout, weekStart, monthAnchor])

  const days: DayInfo[] = useMemo(() => {
    return dates.map((date) => {
      const iso = toIsoDate(date)
      // A day's tasks are anything worked-on OR due that day — a due-date-only
      // task (no work-on date set) still needs to surface on its deadline day.
      const dayTasks = tasks.filter((t) => !t.parentId && !t.done && (t.date === iso || t.dueDate === iso))
      const tags = Array.from(new Set(dayTasks.flatMap((t) => t.tags))).slice(0, 4)
      const inCurrentPeriod = layout === 'week' || date.getMonth() === monthAnchor.getMonth()
      return { date, iso, dayTasks, tags, inCurrentPeriod }
    })
  }, [dates, tasks, layout, monthAnchor])

  const selectedDay = days.find((d) => d.iso === selected) ?? days[0]

  function switchLayout(next: Layout) {
    const anchor = fromIsoDate(selected)
    if (next === 'week') setWeekStart(startOfWeek(anchor))
    else setMonthAnchor(startOfMonth(anchor))
    setLayout(next)
  }

  function shiftPeriod(delta: number) {
    if (layout === 'week') {
      const next = addDays(weekStart, delta * 7)
      setWeekStart(next)
      const nextEndIso = toIsoDate(addDays(next, 6))
      const nextStartIso = toIsoDate(next)
      onSelectDate(today >= nextStartIso && today <= nextEndIso ? today : nextStartIso)
    } else {
      const next = addMonths(monthAnchor, delta)
      setMonthAnchor(next)
      const todayDate = new Date()
      const monthHasToday =
        todayDate.getFullYear() === next.getFullYear() && todayDate.getMonth() === next.getMonth()
      onSelectDate(monthHasToday ? today : toIsoDate(next))
    }
  }

  function goToToday() {
    setWeekStart(startOfWeek(new Date()))
    setMonthAnchor(startOfMonth(new Date()))
    onSelectDate(today)
  }

  const headerLabel =
    layout === 'week'
      ? formatWeekRange(weekStart, addDays(weekStart, 6))
      : monthAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const selectedLabel =
    selectedDay.iso === today
      ? 'today'
      : selectedDay.date
          .toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
          .toLowerCase()

  return (
    <div className="calendar-texture -mx-4 rounded-2xl px-4 py-4 sm:-mx-6 sm:px-6">
      <div className="mb-2 flex justify-end gap-3 text-xs">
        {(['week', 'month'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => switchLayout(l)}
            className={`transition-colors duration-300 ${
              layout === l
                ? 'font-semibold text-raspberry'
                : 'text-ink/40 hover:text-ink/70 dark:text-ink-dark/40 dark:hover:text-ink-dark/70'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftPeriod(-1)}
          aria-label={layout === 'week' ? 'Previous week' : 'Previous month'}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink/50 transition-colors duration-150 hover:bg-ink/5 hover:text-ink dark:text-ink-dark/50 dark:hover:bg-white/10 dark:hover:text-ink-dark"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={goToToday}
          className="font-serif text-lg italic text-ink dark:text-ink-dark"
        >
          {headerLabel}
        </button>

        <button
          type="button"
          onClick={() => shiftPeriod(1)}
          aria-label={layout === 'week' ? 'Next week' : 'Next month'}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink/50 transition-colors duration-150 hover:bg-ink/5 hover:text-ink dark:text-ink-dark/50 dark:hover:bg-white/10 dark:hover:text-ink-dark"
        >
          ›
        </button>
      </div>

      {layout === 'month' && (
        <div className="mb-1 grid grid-cols-7 gap-1 sm:gap-2">
          {WEEKDAY_LABELS.map((w) => (
            <span
              key={w}
              className="text-center text-[10px] uppercase tracking-wide text-ink/40 dark:text-ink-dark/40"
            >
              {w}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {days.map((day) => (
          <DayCell
            key={day.iso}
            day={day}
            isSelected={day.iso === selected}
            isToday={day.iso === today}
            showWeekday={layout === 'week'}
            maxTitles={layout === 'week' ? 4 : 2}
            compact={layout === 'month'}
            onSelect={() => onSelectDate(day.iso)}
          />
        ))}
      </div>

      <div className="mt-6">
        <div className="mb-1 flex items-center gap-2 px-1">
          <h2 className="font-serif text-sm italic text-ink/50 dark:text-ink-dark/50">{selectedLabel}</h2>
          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            aria-label={notes[selectedDay.iso] ? 'Edit note for this day' : 'Add a note for this day'}
            className={`transition-colors duration-150 ${
              notes[selectedDay.iso]
                ? 'text-rose'
                : 'text-ink/25 hover:text-ink/50 dark:text-ink-dark/25 dark:hover:text-ink-dark/50'
            }`}
          >
            <NoteIcon />
          </button>
        </div>

        {noteOpen && (
          <textarea
            autoFocus
            value={notes[selectedDay.iso] ?? ''}
            onChange={(e) => setNoteForDay(selectedDay.iso, e.target.value)}
            placeholder="a scrap of a note for this day…"
            rows={3}
            className="mb-3 w-full rounded-xl border border-ink/10 bg-white/60 px-3 py-2 text-sm text-ink outline-none focus:border-raspberry/40 dark:border-border dark:bg-white/5 dark:text-ink-dark"
          />
        )}

        {selectedDay.dayTasks.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm italic text-ink/40 dark:text-ink-dark/40">
            This one's quiet. For now.
          </p>
        ) : (
          <div className="flex flex-col">
            {(() => {
              const displayTasks = sortChronological(selectedDay.dayTasks)
              return (
                <SortableContext items={displayTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {displayTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      projects={projects}
                      subtasks={tasks.filter((t) => t.parentId === task.id && !t.done)}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onSnooze={onSnooze}
                      onAddSubtask={onAddSubtask}
                      onEdit={onEditTask}
                    />
                  ))}
                </SortableContext>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
