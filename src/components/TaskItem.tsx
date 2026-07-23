import { useState } from 'react'
import type { Priority, Project, Task } from '../types'
import { Checkbox } from './Checkbox'
import { colorForTag } from '../lib/tags'
import { displayColorFor } from '../lib/projectColors'
import { describeRecurrence } from '../lib/recurrence'
import { parseQuickAdd, type ParsedQuickAdd } from '../lib/parseQuickAdd'
import { BellIcon, PaperclipIcon } from './icons'

interface TaskItemProps {
  task: Task
  projects: Project[]
  subtasks?: Task[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAddSubtask?: (parentId: string, parsed: ParsedQuickAdd) => void
  onEdit?: (task: Task) => void
}

interface TaskRowProps {
  task: Task
  projects: Project[]
  compact?: boolean
  onToggle: () => void
  onDelete: () => void
  onEdit?: () => void
}

function priorityColor(p: Priority): string {
  if (p === 3) return '#de2776'
  if (p === 2) return '#ad1357'
  return '#cc698f'
}

function TaskRow({ task, projects, compact, onToggle, onDelete, onEdit }: TaskRowProps) {
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : undefined

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl px-3 transition-colors duration-150 hover:bg-ink/[0.03] dark:hover:bg-white/[0.04] ${compact ? 'py-1.5' : 'py-2.5'}`}
    >
      <Checkbox checked={task.done} onChange={onToggle} label={`Mark "${task.title}" done`} />

      <div
        role={onEdit ? 'button' : undefined}
        tabIndex={onEdit ? 0 : undefined}
        onClick={onEdit}
        onKeyDown={(e) => {
          if (onEdit && (e.key === 'Enter' || e.key === ' ')) onEdit()
        }}
        className={`min-w-0 flex-1 transition-all duration-500 ${onEdit ? 'cursor-pointer' : ''} ${
          task.done ? 'opacity-40' : 'opacity-100'
        }`}
      >
        <span className="flex items-center gap-1.5">
          {task.priority && (
            <span
              aria-label={`Priority ${task.priority}`}
              className="shrink-0 text-xs"
              style={{ color: priorityColor(task.priority) }}
            >
              ⚑
            </span>
          )}
          <span
            className={`block truncate ${compact ? 'text-sm' : ''} ${task.done ? 'line-through decoration-ink/50' : ''}`}
          >
            {task.title}
          </span>
        </span>

        {(project || task.tags.length > 0 || task.recurrence || task.reminders.length > 0 || task.note) && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {project && (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${displayColorFor(project)}22`, color: displayColorFor(project) }}
              >
                @{project.name}
              </span>
            )}
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs text-ink/60 dark:text-ink-dark/60"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: colorForTag(tag) }}
                />
                #{tag}
              </span>
            ))}
            {task.recurrence && (
              <span className="flex items-center gap-1 text-xs text-ink/50 dark:text-ink-dark/50">
                ↻ {describeRecurrence(task.recurrence)}
              </span>
            )}
            {task.reminders.length > 0 && (
              <span className="flex items-center gap-1 text-ink/50 dark:text-ink-dark/50">
                <BellIcon />
              </span>
            )}
            {task.note && (
              <span className="flex items-center gap-1 text-ink/50 dark:text-ink-dark/50">
                <PaperclipIcon />
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete "${task.title}"`}
        className="shrink-0 text-ink/30 opacity-0 transition-opacity duration-150 hover:text-raspberry group-hover:opacity-100 focus-visible:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}

export function TaskItem({ task, projects, subtasks = [], onToggle, onDelete, onAddSubtask, onEdit }: TaskItemProps) {
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [subtaskValue, setSubtaskValue] = useState('')

  function submitSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!onAddSubtask) return
    const parsed = parseQuickAdd(subtaskValue)
    if (!parsed.title) return
    onAddSubtask(task.id, parsed)
    setSubtaskValue('')
  }

  const isSubtask = task.parentId !== null

  return (
    <div>
      <TaskRow
        task={task}
        projects={projects}
        onToggle={() => onToggle(task.id)}
        onDelete={() => onDelete(task.id)}
        onEdit={onEdit ? () => onEdit(task) : undefined}
      />

      {(subtasks.length > 0 || addingSubtask) && (
        <div className="ml-8 flex flex-col border-l border-ink/10 pl-2 dark:border-white/10">
          {subtasks.map((sub) => (
            <TaskRow
              key={sub.id}
              task={sub}
              projects={projects}
              compact
              onToggle={() => onToggle(sub.id)}
              onDelete={() => onDelete(sub.id)}
              onEdit={onEdit ? () => onEdit(sub) : undefined}
            />
          ))}

          {addingSubtask && (
            <form onSubmit={submitSubtask} className="px-3 py-1.5">
              <input
                autoFocus
                type="text"
                value={subtaskValue}
                onChange={(e) => setSubtaskValue(e.target.value)}
                onBlur={() => {
                  if (!subtaskValue) setAddingSubtask(false)
                }}
                placeholder="add a subtask…"
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink/35 outline-none dark:text-ink-dark dark:placeholder:text-ink-dark/35"
              />
            </form>
          )}
        </div>
      )}

      {!isSubtask && !addingSubtask && onAddSubtask && (
        <button
          type="button"
          onClick={() => setAddingSubtask(true)}
          className="ml-8 pl-2 text-xs text-ink/30 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/30"
        >
          + subtask
        </button>
      )}
    </div>
  )
}
