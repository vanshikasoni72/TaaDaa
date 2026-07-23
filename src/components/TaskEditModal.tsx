import { useState } from 'react'
import type { Priority, Project, ReminderRule, Task } from '../types'

interface TaskEditModalProps {
  task: Task
  projects: Project[]
  onClose: () => void
  onChange: (id: string, changes: Partial<Task>) => void
  onDelete: (id: string) => void
  onResolveProject: (raw: string) => string
}

const REMINDER_PRESETS: { label: string; leadMinutes: number }[] = [
  { label: 'at due time', leadMinutes: 0 },
  { label: '1 hour before', leadMinutes: 60 },
  { label: '1 day before', leadMinutes: 60 * 24 },
  { label: '1 week before', leadMinutes: 60 * 24 * 7 },
]

function fieldLabel(text: string) {
  return (
    <span className="mb-1 block text-xs uppercase tracking-wide text-ink/40 dark:text-ink-dark/40">{text}</span>
  )
}

const fieldClass =
  'w-full rounded-lg border border-ink/10 bg-white/60 px-2 py-1.5 text-sm text-ink outline-none focus:border-raspberry/40 dark:border-border dark:bg-transparent dark:text-ink-dark'

export function TaskEditModal({ task, projects, onClose, onChange, onDelete, onResolveProject }: TaskEditModalProps) {
  const [newProjectName, setNewProjectName] = useState('')
  const [addingProject, setAddingProject] = useState(false)
  const [tagsText, setTagsText] = useState(task.tags.map((t) => `#${t}`).join(' '))

  function commitTags(value: string) {
    setTagsText(value)
    const tags = Array.from(
      new Set(
        value
          .split(/\s+/)
          .map((s) => s.replace(/^#/, '').trim().toLowerCase())
          .filter(Boolean),
      ),
    )
    onChange(task.id, { tags })
  }

  function toggleReminder(leadMinutes: number) {
    const has = task.reminders.some((r) => r.leadMinutes === leadMinutes)
    let next: ReminderRule[]
    if (has) {
      next = task.reminders.filter((r) => r.leadMinutes !== leadMinutes)
    } else if (task.reminders.length >= 3) {
      return
    } else {
      next = [...task.reminders, { leadMinutes }].sort((a, b) => a.leadMinutes - b.leadMinutes)
    }
    onChange(task.id, { reminders: next })
  }

  function handleProjectSelect(value: string) {
    if (value === '__new__') {
      setAddingProject(true)
      return
    }
    onChange(task.id, { projectId: value === '__none__' ? null : value })
  }

  function submitNewProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newProjectName.trim()) return
    const id = onResolveProject(newProjectName.trim())
    onChange(task.id, { projectId: id })
    setNewProjectName('')
    setAddingProject(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center dark:bg-black/60">
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-5 sm:rounded-3xl dark:bg-cream-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <input
            type="text"
            value={task.title}
            onChange={(e) => onChange(task.id, { title: e.target.value })}
            className="flex-1 bg-transparent font-serif text-2xl italic text-heading outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-ink/40 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/40"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label>
              {fieldLabel('Work on')}
              <input
                type="date"
                value={task.date ?? ''}
                onChange={(e) => onChange(task.id, { date: e.target.value || null })}
                className={fieldClass}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs uppercase tracking-wide text-magenta">Due date</span>
              <input
                type="date"
                value={task.dueDate ?? ''}
                onChange={(e) => onChange(task.id, { dueDate: e.target.value || null })}
                className={fieldClass}
              />
            </label>
          </div>

          <label>
            {fieldLabel('Time')}
            <input
              type="time"
              value={task.time ?? ''}
              onChange={(e) => onChange(task.id, { time: e.target.value || null })}
              className={fieldClass}
            />
          </label>

          <div>
            {fieldLabel('Project')}
            {addingProject ? (
              <form onSubmit={submitNewProject} className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Home or Home/Groceries"
                  className={fieldClass}
                />
                <button type="submit" className="text-sm font-medium text-raspberry">
                  add
                </button>
              </form>
            ) : (
              <select value={task.projectId ?? '__none__'} onChange={(e) => handleProjectSelect(e.target.value)} className={fieldClass}>
                <option value="__none__">no project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.parentId ? `${projects.find((pp) => pp.id === p.parentId)?.name} / ${p.name}` : p.name}
                  </option>
                ))}
                <option value="__new__">+ new project…</option>
              </select>
            )}
          </div>

          <div>
            {fieldLabel('Priority')}
            <div className="flex gap-2">
              {([null, 1, 2, 3] as (Priority | null)[]).map((p) => (
                <button
                  key={String(p)}
                  type="button"
                  onClick={() => onChange(task.id, { priority: p })}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-sm transition-colors duration-150 ${
                    task.priority === p
                      ? 'border-raspberry bg-raspberry/10 text-raspberry'
                      : 'border-ink/10 text-ink/50 hover:border-ink/20 dark:border-border dark:text-ink-dark/50'
                  }`}
                >
                  {p === null ? 'none' : `⚑ ${p}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            {fieldLabel('Tags')}
            <input type="text" value={tagsText} onChange={(e) => commitTags(e.target.value)} placeholder="#fun #social" className={fieldClass} />
          </div>

          <div>
            {fieldLabel('Reminders (up to 3)')}
            <div className="flex flex-wrap gap-2">
              {REMINDER_PRESETS.map((preset) => {
                const active = task.reminders.some((r) => r.leadMinutes === preset.leadMinutes)
                return (
                  <button
                    key={preset.leadMinutes}
                    type="button"
                    onClick={() => toggleReminder(preset.leadMinutes)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${
                      active
                        ? 'border-raspberry bg-raspberry/10 text-raspberry'
                        : 'border-ink/10 text-ink/50 hover:border-ink/20 dark:border-border dark:text-ink-dark/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            {fieldLabel('Note / link')}
            <input
              type="text"
              value={task.note ?? ''}
              onChange={(e) => onChange(task.id, { note: e.target.value || null })}
              placeholder="anything worth attaching"
              className={fieldClass}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onDelete(task.id)
              onClose()
            }}
            className="mt-2 self-start text-xs text-ink/30 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/30"
          >
            delete task
          </button>
        </div>
      </div>
    </div>
  )
}
