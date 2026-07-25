import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'

interface TaskColumnProps {
  label: string
  emptyLabel: string
  tasks: Task[]
  allTasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

// Stays wrapped in a SortableContext purely so its tasks are still drag-
// *sources* onto the Calendar/Sidebar drop zones — every column here sorts
// strictly chronologically by design (see CLAUDE.md), so it deliberately
// never reads a task's `order` field back, and a within-list drag has no
// persisted visual effect.

/** A labeled list of tasks — no sorting of its own, the caller passes `tasks` already ordered. Shared between Upcoming's Tasks/Deadlines split and Today's matching split, so the two stay visually identical. */
export function TaskColumn({
  label,
  emptyLabel,
  tasks,
  allTasks,
  projects,
  onToggle,
  onDelete,
  onSnooze,
  onAddSubtask,
  onEditTask,
}: TaskColumnProps) {
  return (
    <div>
      <h2 className="mb-1 px-3 text-xs uppercase tracking-wide text-ink/35 dark:text-ink-dark/35">{label}</h2>
      {tasks.length === 0 ? (
        <p className="px-3 py-4 text-sm italic text-ink/40 dark:text-ink-dark/40">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col">
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
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
      )}
    </div>
  )
}
