import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'

interface CompletedViewProps {
  tasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

/** A flat, most-recent-first archive of everything finished — every other view drops a task the instant it's done, this is the one place it's still findable. Un-checking here vanishes it from this list too, same instant-removal convention as everywhere else. */
export function CompletedView({
  tasks,
  projects,
  onToggle,
  onDelete,
  onSnooze,
  onAddSubtask,
  onEditTask,
}: CompletedViewProps) {
  const completed = tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-4xl italic text-heading">Completed</h1>
      </header>

      {completed.length === 0 ? (
        <p className="px-3 py-12 text-center font-serif italic text-ink/40 dark:text-ink-dark/40">
          Nothing finished yet. It happens.
        </p>
      ) : (
        <div className="flex flex-col">
          <SortableContext items={completed.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {completed.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                projects={projects}
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
