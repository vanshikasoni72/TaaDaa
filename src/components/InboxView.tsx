import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'

interface InboxViewProps {
  tasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

export function InboxView({ tasks, projects, onToggle, onDelete, onSnooze, onAddSubtask, onEditTask }: InboxViewProps) {
  // Pure capture bucket: no project AND no date at all — the moment either
  // gets set, the task belongs to a planning view (Today/Upcoming/Home)
  // instead, not here.
  const inbox = tasks
    .filter((t) => !t.done && t.parentId === null && t.projectId === null && t.date === null && t.dueDate === null)
    .sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-4xl italic text-heading">Inbox</h1>
        <p className="mt-1 text-sm text-ink/50 dark:text-ink-dark/50">not filed anywhere yet</p>
      </header>

      {inbox.length === 0 ? (
        <p className="px-3 py-12 text-center font-serif italic text-ink/40 dark:text-ink-dark/40">
          Blank canvas. Or you're procrastinating. Unclear.
        </p>
      ) : (
        <div className="flex flex-col">
          <SortableContext items={inbox.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {inbox.map((task) => (
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
        </div>
      )}
    </div>
  )
}
