import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'
import { addDays, todayIso, toIsoDate } from '../lib/date'
import { displayColorFor } from '../lib/projectColors'

interface HomeViewProps {
  tasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

interface GroupProps {
  title: string
  color?: string
  tasks: Task[]
  allTasks: Task[]
  projects: Project[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

function Group({ title, color, tasks, allTasks, projects, onToggle, onDelete, onSnooze, onAddSubtask, onEditTask }: GroupProps) {
  if (tasks.length === 0) return null
  return (
    <div>
      <h2 className="mb-1 flex items-center gap-2 px-3 font-serif text-sm italic text-ink/50 dark:text-ink-dark/50">
        {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
        {title}
        <span className="text-ink/30 dark:text-ink-dark/30">({tasks.length})</span>
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
            onSnooze={onSnooze}
            onAddSubtask={onAddSubtask}
            onEdit={onEditTask}
          />
        ))}
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="mb-6">
      <h1 className="font-serif text-4xl italic text-heading">Home</h1>
      <p className="mt-1 text-sm text-ink/50 dark:text-ink-dark/50">next 7 days, by project</p>
    </header>
  )
}

export function HomeView({ tasks, projects, onToggle, onDelete, onSnooze, onAddSubtask, onEditTask }: HomeViewProps) {
  const today = todayIso()
  const rangeEnd = toIsoDate(addDays(new Date(), 6))
  const topLevel = tasks.filter((t) => t.parentId === null)

  // "yesterday's problem" now keys off the due date (the actual deadline) —
  // the work-on date still drives normal calendar/grouping placement below.
  const overdue = topLevel
    .filter((t) => !t.done && t.dueDate && t.dueDate < today)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))

  const inRange = topLevel.filter((t) => t.date && t.date >= today && t.date <= rangeEnd)

  const byProject = new Map<string | null, Task[]>()
  for (const task of inRange) {
    const key = task.projectId
    const list = byProject.get(key) ?? []
    list.push(task)
    byProject.set(key, list)
  }
  for (const list of byProject.values()) list.sort((a, b) => a.date!.localeCompare(b.date!))

  const groups = Array.from(byProject.entries())
    .map(([projectId, groupTasks]) => ({
      projectId,
      project: projectId ? projects.find((p) => p.id === projectId) : undefined,
      tasks: groupTasks,
      earliest: groupTasks[0].date!,
    }))
    .sort((a, b) => a.earliest.localeCompare(b.earliest))

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

  if (overdue.length === 0 && groups.length === 0) {
    return (
      <div>
        <Header />
        <p className="px-3 py-12 text-center font-serif italic text-ink/40 dark:text-ink-dark/40">
          Nothing left. Go be hot elsewhere.
        </p>
      </div>
    )
  }

  const groupProps = { allTasks: tasks, projects, onToggle, onDelete, onSnooze, onAddSubtask, onEditTask }

  return (
    <div>
      <Header />
      <div className="flex flex-col gap-6">
        <Group title="yesterday's problem" tasks={overdue} {...groupProps} />
        {groups.map(({ projectId, project, tasks: groupTasks }) => (
          <Group
            key={projectId ?? 'none'}
            title={
              project
                ? project.parentId
                  ? `${projects.find((p) => p.id === project.parentId)?.name} / ${project.name}`
                  : project.name
                : 'no project'
            }
            color={project ? displayColorFor(project) : undefined}
            tasks={groupTasks}
            {...groupProps}
          />
        ))}
      </div>
    </div>
  )
}
