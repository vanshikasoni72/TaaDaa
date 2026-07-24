import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'
import { displayColorFor } from '../lib/projectColors'
import { chronoDate } from '../lib/sortTasks'

interface ProjectViewProps {
  project: Project
  tasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

export function ProjectView({ project, tasks, projects, onToggle, onDelete, onSnooze, onAddSubtask, onEditTask }: ProjectViewProps) {
  const projectTasks = tasks
    .filter((t) => !t.done && t.projectId === project.id && t.parentId === null)
    .sort((a, b) => {
      const aDate = chronoDate(a)
      const bDate = chronoDate(b)
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      return aDate.localeCompare(bDate)
    })

  return (
    <div>
      <header className="mb-6 flex items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: displayColorFor(project) }} />
        <h1 className="font-serif text-4xl italic text-heading">{project.name}</h1>
      </header>

      {projectTasks.length === 0 ? (
        <p className="px-3 py-12 text-center font-serif italic text-ink/40 dark:text-ink-dark/40">
          This one's quiet. For now.
        </p>
      ) : (
        <div className="flex flex-col">
          <SortableContext items={projectTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {projectTasks.map((task) => (
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
