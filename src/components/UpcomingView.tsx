import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'
import { todayIso } from '../lib/date'

// Note: Upcoming's list stays wrapped in a SortableContext (below) purely so
// its tasks are still drag-*sources* onto the Calendar/Sidebar drop zones —
// this view's own sort is strictly chronological by design (see CLAUDE.md),
// so unlike Today/Home it deliberately never reads a task's `order` field
// back, and a within-list drag here has no persisted visual effect.

interface UpcomingViewProps {
  tasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

// The earliest of a task's work-on/due dates that's actually in the future —
// a task can have one, the other, or both set to a future date, and Upcoming
// sorts by whichever comes first.
function upcomingSortKey(task: Task, today: string): string {
  const candidates = [task.date, task.dueDate].filter((d): d is string => d !== null && d > today)
  return candidates.sort()[0]
}

export function UpcomingView({ tasks, projects, onToggle, onDelete, onSnooze, onAddSubtask, onEditTask }: UpcomingViewProps) {
  const today = todayIso()
  const topLevel = tasks.filter((t) => t.parentId === null)
  const upcoming = topLevel
    .filter((t) => (t.date && t.date > today) || (t.dueDate && t.dueDate > today))
    .sort((a, b) => upcomingSortKey(a, today).localeCompare(upcomingSortKey(b, today)))

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-4xl italic text-heading">Upcoming</h1>
        <p className="mt-1 text-sm text-ink/50 dark:text-ink-dark/50">what's coming, date-wise</p>
      </header>

      {upcoming.length === 0 ? (
        <p className="px-3 py-12 text-center font-serif italic text-ink/40 dark:text-ink-dark/40">
          Nothing on the horizon. For now.
        </p>
      ) : (
        <div className="flex flex-col">
          <SortableContext items={upcoming.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {upcoming.map((task) => (
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
          </SortableContext>
        </div>
      )}
    </div>
  )
}
