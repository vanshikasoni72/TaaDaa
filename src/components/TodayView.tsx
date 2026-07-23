import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'
import { todayIso } from '../lib/date'

interface TodayViewProps {
  tasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
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
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

function Section({ title, tasks, allTasks, projects, onToggle, onDelete, onAddSubtask, onEditTask }: SectionProps) {
  if (tasks.length === 0) return null
  return (
    <div>
      <h2 className="mb-1 px-3 font-serif text-sm italic text-ink/50 dark:text-ink-dark/50">
        {title}
      </h2>
      <div className="flex flex-col">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            projects={projects}
            subtasks={allTasks.filter((t) => t.parentId === task.id)}
            onToggle={onToggle}
            onDelete={onDelete}
            onAddSubtask={onAddSubtask}
            onEdit={onEditTask}
          />
        ))}
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
      <h1 className="font-serif text-4xl italic text-ink dark:text-ink-dark">Today</h1>
      <p className="mt-1 text-sm text-ink/50 dark:text-ink-dark/50">{todayLabel}</p>
    </header>
  )
}

export function TodayView({ tasks, projects, onToggle, onDelete, onAddSubtask, onEditTask }: TodayViewProps) {
  const today = todayIso()
  const topLevel = tasks.filter((t) => t.parentId === null)

  const overdue = topLevel.filter((t) => !t.done && t.date && t.date < today)
  const dueToday = topLevel.filter((t) => t.date === today)
  const upcoming = topLevel
    .filter((t) => t.date && t.date > today)
    .sort((a, b) => a.date!.localeCompare(b.date!))
  const unscheduled = topLevel.filter((t) => t.date === null)

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

  const allDone = topLevel.every((t) => t.done)
  if (allDone) {
    return (
      <div>
        <Header />
        <p className="px-3 py-12 text-center font-serif italic text-ink/40 dark:text-ink-dark/40">
          Nothing left. Go be hot elsewhere.
        </p>
      </div>
    )
  }

  const sectionProps = { allTasks: tasks, projects, onToggle, onDelete, onAddSubtask, onEditTask }

  return (
    <div>
      <Header />
      <div className="flex flex-col gap-6">
        <Section title="yesterday's problem" tasks={overdue} {...sectionProps} />
        <Section title="today" tasks={dueToday} {...sectionProps} />
        <Section title="upcoming" tasks={upcoming} {...sectionProps} />
        <Section title="whenever" tasks={unscheduled} {...sectionProps} />
      </div>
    </div>
  )
}
