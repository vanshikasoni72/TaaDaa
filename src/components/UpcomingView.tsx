import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskColumn } from './TaskColumn'
import { addDays, todayIso, toIsoDate } from '../lib/date'

interface UpcomingViewProps {
  tasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

export function UpcomingView({ tasks, projects, onToggle, onDelete, onSnooze, onAddSubtask, onEditTask }: UpcomingViewProps) {
  const today = todayIso()
  const rangeEnd = toIsoDate(addDays(new Date(), 7))
  const topLevel = tasks.filter((t) => t.parentId === null)

  // Two independent columns rather than one merged chronological list — a
  // task with both a work-on date and a deadline in range can legitimately
  // appear in both, since the two dates are answering different questions
  // ("when am I doing this" vs. "when is this actually due").
  const deadlines = topLevel
    .filter((t) => !t.done && t.dueDate && t.dueDate > today && t.dueDate <= rangeEnd)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  const scheduled = topLevel
    .filter((t) => !t.done && t.date && t.date > today && t.date <= rangeEnd)
    .sort((a, b) => a.date!.localeCompare(b.date!))

  const columnProps = { allTasks: tasks, projects, onToggle, onDelete, onSnooze, onAddSubtask, onEditTask }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-4xl italic text-heading">Upcoming</h1>
        <p className="mt-1 text-sm text-ink/50 dark:text-ink-dark/50">next 7 days</p>
      </header>

      {deadlines.length === 0 && scheduled.length === 0 ? (
        <p className="px-3 py-12 text-center font-serif italic text-ink/40 dark:text-ink-dark/40">
          Nothing on the horizon. For now.
        </p>
      ) : (
        <div className="flex flex-col gap-8 sm:grid sm:grid-cols-2 sm:gap-6">
          <TaskColumn label="Tasks" emptyLabel="Nothing scheduled this week." tasks={scheduled} {...columnProps} />
          <TaskColumn label="Deadlines" emptyLabel="Nothing due this week." tasks={deadlines} {...columnProps} />
        </div>
      )}
    </div>
  )
}
