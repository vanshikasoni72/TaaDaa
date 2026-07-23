import { useEffect, useMemo, useState } from 'react'
import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'
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
import { colorForTag } from '../lib/tags'
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
  if (count === 0) return 'bg-ink/5 dark:bg-white/5'
  if (count <= 2) return 'bg-raspberry/15'
  if (count <= 4) return 'bg-raspberry/30'
  return 'bg-raspberry/45'
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
  projects: Project[]
  isSelected: boolean
  isToday: boolean
  showWeekday: boolean
  maxTitles: number
  compact: boolean
  onSelect: () => void
}

function DayCell({ day, projects, isSelected, isToday, showWeekday, maxTitles, compact, onSelect }: DayCellProps) {
  const sorted = [...day.dayTasks].sort((a, b) => Number(a.done) - Number(b.done))
  const visible = sorted.slice(0, maxTitles)
  const hiddenCount = sorted.length - visible.length

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-stretch gap-1.5 rounded-xl px-2 py-3 text-left transition duration-300 hover:ring-1 hover:ring-ink/10 dark:hover:ring-border ${compact ? 'min-h-[92px] sm:min-h-[112px]' : 'min-h-[112px] sm:min-h-[132px]'} ${
        isSelected ? 'bg-raspberry/20 ring-2 ring-raspberry/50' : heatClass(day.dayTasks.length)
      } ${day.inCurrentPeriod ? '' : 'opacity-35'}`}
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

      <div className="mt-0.5 flex flex-col gap-0.5 overflow-hidden">
        {visible.map((task) => (
          <span
            key={task.id}
            className={`flex items-center gap-1 text-[11px] leading-tight ${
              task.done ? 'text-ink/35 line-through dark:text-ink-dark/35' : 'text-ink/80 dark:text-ink-dark/80'
            }`}
          >
            {task.tags[0] && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorForTag(task.tags[0]) }}
              />
            )}
            <span className="truncate">
              {task.projectId ? `@${projects.find((p) => p.id === task.projectId)?.name ?? ''} ` : ''}
              {task.title}
            </span>
          </span>
        ))}
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
      const dayTasks = tasks.filter((t) => t.date === iso && !t.parentId)
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
            projects={projects}
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
            {selectedDay.dayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                projects={projects}
                subtasks={tasks.filter((t) => t.parentId === task.id)}
                onToggle={onToggle}
                onDelete={onDelete}
                onSnooze={onSnooze}
                onAddSubtask={onAddSubtask}
                onEdit={onEditTask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
