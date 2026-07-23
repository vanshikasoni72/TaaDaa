import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'
import { todayIso } from '../lib/date'

interface UpcomingViewProps {
  tasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

export function UpcomingView({ tasks, projects, onToggle, onDelete, onAddSubtask, onEditTask }: UpcomingViewProps) {
  const today = todayIso()
  const topLevel = tasks.filter((t) => t.parentId === null)
  const upcoming = topLevel
    .filter((t) => t.date && t.date > today)
    .sort((a, b) => a.date!.localeCompare(b.date!))

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-4xl italic text-ink dark:text-ink-dark">Upcoming</h1>
        <p className="mt-1 text-sm text-ink/50 dark:text-ink-dark/50">everything after today</p>
      </header>

      {upcoming.length === 0 ? (
        <p className="px-3 py-12 text-center font-serif italic text-ink/40 dark:text-ink-dark/40">
          Nothing on the horizon. For now.
        </p>
      ) : (
        <div className="flex flex-col">
          {upcoming.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projects={projects}
              subtasks={tasks.filter((t) => t.parentId === task.id)}
              onToggle={onToggle}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              onEdit={onEditTask}
            />
          ))}
        </div>
      )}
    </div>
  )
}
