import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'
import { TaskColumn } from './TaskColumn'
import { todayIso } from '../lib/date'
import { sortChronological } from '../lib/sortTasks'

interface TodayViewProps {
  tasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

interface SectionProps {
  title: string
  tasks: Task[]
  allTasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

// "yesterday's problem" stays a single full-width section, not split into
// Tasks/Deadlines like "today" below — its whole point is being deliberately
// broad (either date type slipping counts as overdue, see CLAUDE.md), so
// splitting it would fight that design rather than declutter it.
function Section({ title, tasks, allTasks, projects, onToggle, onDelete, onSnooze, onAddSubtask, onEditTask }: SectionProps) {
  if (tasks.length === 0) return null
  const displayTasks = sortChronological(tasks)
  return (
    <div>
      <h2 className="mb-1 px-3 font-serif text-sm italic text-ink/50 dark:text-ink-dark/50">
        {title}
      </h2>
      <div className="flex flex-col">
        <SortableContext items={displayTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {displayTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projects={projects}
              subtasks={allTasks.filter((t) => t.parentId === task.id && !t.done)}
              onToggle={onToggle}
              onDelete={onDelete}
              onSnooze={onSnooze}
              onAddSubtask={onAddSubtask}
              onEdit={onEditTask}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

function Header() {
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  return (
    <header className="mb-6">
      <h1 className="font-serif text-4xl italic text-heading">Today</h1>
      <p className="mt-1 text-sm text-ink/50 dark:text-ink-dark/50">{todayLabel}</p>
    </header>
  )
}

export function TodayView({ tasks, projects, onToggle, onDelete, onSnooze, onAddSubtask, onEditTask }: TodayViewProps) {
  const today = todayIso()
  const topLevel = tasks.filter((t) => t.parentId === null)

  // "yesterday's problem" here means either date could have slipped — a
  // work-on date left in the past, or a real deadline that's passed —
  // so nothing that needed attention by now falls through the cracks.
  const overdue = topLevel.filter(
    (t) => !t.done && ((t.date && t.date < today) || (t.dueDate && t.dueDate < today)),
  )
  const overdueIds = new Set(overdue.map((t) => t.id))
  // "today" splits the same way Upcoming's window does: a Tasks column (work-
  // on today) and a Deadlines column (due today) — a task that's both shows
  // in both, since the two dates answer different questions.
  const tasksToday = topLevel.filter((t) => !t.done && t.date === today && !overdueIds.has(t.id))
  const deadlinesToday = topLevel.filter((t) => !t.done && t.dueDate === today && !overdueIds.has(t.id))

  if (topLevel.length === 0) {
    return (
      <div>
        <Header />
        <p className="px-3 py-12 text-center font-serif italic text-ink/40 dark:text-ink-dark/40">
          Blank canvas. Or you're procrastinating. Unclear.
        </p>
      </div>
    )
  }

  if (overdue.length === 0 && tasksToday.length === 0 && deadlinesToday.length === 0) {
    return (
      <div>
        <Header />
        <p className="px-3 py-12 text-center font-serif italic text-ink/40 dark:text-ink-dark/40">
          Nothing left. Go be hot elsewhere.
        </p>
      </div>
    )
  }

  const sectionProps = { allTasks: tasks, projects, onToggle, onDelete, onSnooze, onAddSubtask, onEditTask }

  return (
    <div>
      <Header />
      <div className="flex flex-col gap-6">
        <Section title="yesterday's problem" tasks={overdue} {...sectionProps} />
        {(tasksToday.length > 0 || deadlinesToday.length > 0) && (
          <div className="flex flex-col gap-8 sm:grid sm:grid-cols-2 sm:gap-6">
            <TaskColumn
              label="Tasks"
              emptyLabel="Nothing scheduled today."
              tasks={sortChronological(tasksToday)}
              {...sectionProps}
            />
            <TaskColumn
              label="Deadlines"
              emptyLabel="Nothing due today."
              tasks={sortChronological(deadlinesToday)}
              {...sectionProps}
            />
          </div>
        )}
      </div>
    </div>
  )
}
