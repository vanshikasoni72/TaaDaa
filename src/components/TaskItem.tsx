import { useRef, useState } from 'react'
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
  onSnooze?: (id: string, days: 1 | 7) => void
  onAddSubtask?: (parentId: string, parsed: ParsedQuickAdd) => void
  onEdit?: (task: Task) => void
}

interface TaskRowProps {
  task: Task
  projects: Project[]
  compact?: boolean
  onToggle: () => void
  onDelete: () => void
  onSnooze?: (days: 1 | 7) => void
  onEdit?: () => void
}

function priorityColor(p: Priority): string {
  if (p === 3) return '#de2776'
  if (p === 2) return '#ad1357'
  return '#cc698f'
}

const REVEAL_WIDTH = 144

function TaskRow({ task, projects, compact, onToggle, onDelete, onSnooze, onEdit }: TaskRowProps) {
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : undefined
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartOffset = useRef(0)

  function close() {
    setDragX(0)
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!onSnooze) return
    dragStartX.current = e.clientX
    dragStartOffset.current = dragX
    setDragging(true)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const delta = e.clientX - dragStartX.current
    const next = Math.min(0, Math.max(-REVEAL_WIDTH, dragStartOffset.current + delta))
    setDragX(next)
  }

  function handlePointerUp() {
    if (!dragging) return
    setDragging(false)
    setDragX((x) => (x < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0))
  }

  function handleRowClick() {
    if (dragX !== 0) {
      close()
      return
    }
    onEdit?.()
  }

  function snooze(days: 1 | 7) {
    onSnooze?.(days)
    close()
  }

  const dueDatePassed = task.dueDate && !task.done && task.dueDate < new Date().toISOString().slice(0, 10)

  return (
    <div className="relative overflow-hidden rounded-xl">
      {onSnooze && (
        <div className="absolute inset-y-1 right-0 flex items-stretch overflow-hidden rounded-xl" style={{ width: REVEAL_WIDTH }}>
          <button
            type="button"
            onClick={() => snooze(1)}
            className="flex-1 bg-rose/20 text-xs font-medium text-rose transition-colors duration-150 hover:bg-rose/30"
          >
            tomorrow
          </button>
          <button
            type="button"
            onClick={() => snooze(7)}
            className="flex-1 bg-berry/20 text-xs font-medium text-berry transition-colors duration-150 hover:bg-berry/30"
          >
            next week
          </button>
        </div>
      )}

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ transform: `translateX(${dragX}px)`, transition: dragging ? 'none' : 'transform 200ms ease-out' }}
        // Hover tint is mixed into a fully opaque solid color (not a translucent
        // bg-ink/[x%] overlay) — this row sits directly on top of the snooze
        // reveal panel underneath, so any translucent hover background lets
        // that panel show through and visually collide with the row's own
        // content. A solid color-mix keeps the row opaque at every state.
        className={`group relative flex touch-pan-y items-center gap-3 rounded-xl bg-cream px-3 transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--color-cream)_97%,var(--color-ink)_3%)] dark:bg-cream-dark dark:hover:bg-[color-mix(in_oklab,var(--color-cream-dark)_96%,white_4%)] ${compact ? 'py-1.5' : 'py-2.5'}`}
      >
        <Checkbox checked={task.done} onChange={onToggle} label={`Mark "${task.title}" done`} />

        <div
          role={onEdit ? 'button' : undefined}
          tabIndex={onEdit ? 0 : undefined}
          onClick={handleRowClick}
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

          {(project ||
            task.tags.length > 0 ||
            task.recurrence ||
            task.reminders.length > 0 ||
            task.note ||
            task.date ||
            task.dueDate) && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {task.date && (
                <span className="text-xs text-ink/50 dark:text-ink-dark/50">{task.date}</span>
              )}
              {task.dueDate && (
                <span
                  className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    dueDatePassed ? 'bg-magenta/20 text-magenta' : 'text-magenta/80'
                  }`}
                >
                  due {task.dueDate}
                </span>
              )}
              {project && (
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium dark:!bg-badge-bg dark:!text-badge-text"
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

        {onSnooze && (
          <button
            type="button"
            onClick={() => setDragX((x) => (x === 0 ? -REVEAL_WIDTH : 0))}
            aria-label={`Snooze "${task.title}"`}
            tabIndex={dragX === 0 ? 0 : -1}
            className={`hidden shrink-0 text-ink/30 transition-opacity duration-150 hover:text-rose focus-visible:opacity-100 sm:block ${
              dragX === 0 ? 'opacity-0 group-hover:opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            ⏰
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete "${task.title}"`}
          tabIndex={dragX === 0 ? 0 : -1}
          className={`shrink-0 text-ink/30 transition-opacity duration-150 hover:text-raspberry focus-visible:opacity-100 ${
            dragX === 0 ? 'opacity-0 group-hover:opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export function TaskItem({ task, projects, subtasks = [], onToggle, onDelete, onSnooze, onAddSubtask, onEdit }: TaskItemProps) {
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
        onSnooze={onSnooze ? (days) => onSnooze(task.id, days) : undefined}
        onEdit={onEdit ? () => onEdit(task) : undefined}
      />

      {(subtasks.length > 0 || addingSubtask) && (
        <div className="ml-8 flex flex-col border-l border-ink/10 pl-2 dark:border-border">
          {subtasks.map((sub) => (
            <TaskRow
              key={sub.id}
              task={sub}
              projects={projects}
              compact
              onToggle={() => onToggle(sub.id)}
              onDelete={() => onDelete(sub.id)}
              onSnooze={onSnooze ? (days) => onSnooze(sub.id, days) : undefined}
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
