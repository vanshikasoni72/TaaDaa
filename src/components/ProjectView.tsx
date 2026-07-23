import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'
import { displayColorFor } from '../lib/projectColors'

interface ProjectViewProps {
  project: Project
  tasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

export function ProjectView({ project, tasks, projects, onToggle, onDelete, onAddSubtask, onEditTask }: ProjectViewProps) {
  const projectTasks = tasks
    .filter((t) => t.projectId === project.id && t.parentId === null)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.localeCompare(b.date)
    })

  return (
    <div>
      <header className="mb-6 flex items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: displayColorFor(project) }} />
        <h1 className="font-serif text-4xl italic text-ink dark:text-ink-dark">{project.name}</h1>
      </header>

      {projectTasks.length === 0 ? (
        <p className="px-3 py-12 text-center font-serif italic text-ink/40 dark:text-ink-dark/40">
          This one's quiet. For now.
        </p>
      ) : (
        <div className="flex flex-col">
          {projectTasks.map((task) => (
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
