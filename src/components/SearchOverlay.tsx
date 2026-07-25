import { useEffect, useMemo, useState } from 'react'
import type { Project, Task } from '../types'
import type { ParsedQuickAdd } from '../lib/parseQuickAdd'
import { TaskItem } from './TaskItem'
import { chronoDate } from '../lib/sortTasks'
import { SearchIcon } from './icons'

interface SearchOverlayProps {
  tasks: Task[]
  projects: Project[]
  onClose: () => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onSnooze: (id: string, days: 1 | 7) => void
  onAddSubtask: (parentId: string, parsed: ParsedQuickAdd) => void
  onEditTask: (task: Task) => void
}

/** A global, flat lookup across every task (subtasks and completed ones included) by title — the one place in the app that looks outside whatever view is currently open. */
export function SearchOverlay({
  tasks,
  projects,
  onClose,
  onToggle,
  onDelete,
  onSnooze,
  onAddSubtask,
  onEditTask,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function requestClose() {
    setOpen(false)
    setTimeout(onClose, 200)
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Not-done matches first (soonest doing/deadline date first), then done
  // matches (most recently completed first) — mirrors sortChronological's
  // key for the active half, and CompletedView's for the done half.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        if (!a.done) return (chronoDate(a) ?? '9999-99-99').localeCompare(chronoDate(b) ?? '9999-99-99')
        return (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt)
      })
  }, [tasks, query])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 dark:bg-black/60 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={requestClose}
      />
      <aside
        className={`relative flex h-full w-full max-w-[420px] flex-col border-l border-border bg-cream shadow-xl transition-transform duration-200 ease-out dark:border-white/[0.08] dark:bg-cream-dark/95 dark:backdrop-blur-lg ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-6">
          <h2 className="font-serif text-xl italic text-heading">Search</h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close search"
            className="text-ink/40 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/40"
          >
            ✕
          </button>
        </div>

        <div className="relative px-4 pt-4">
          <span className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-ink/30 dark:text-ink-dark/30">
            <SearchIcon size={15} />
          </span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search tasks…"
            className="w-full rounded-xl border border-quickadd-border bg-quickadd py-2 pl-8 pr-3 text-sm text-ink placeholder:text-ink/35 outline-none focus:border-raspberry/40 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
          />
        </div>

        <div className="mt-4 flex-1 overflow-y-auto px-4 pb-4">
          {query.trim() === '' ? (
            <p className="px-1 py-8 text-center text-sm italic text-ink/40 dark:text-ink-dark/40">
              Start typing to find a task.
            </p>
          ) : results.length === 0 ? (
            <p className="px-1 py-8 text-center text-sm italic text-ink/40 dark:text-ink-dark/40">
              Nothing matches. Try different words.
            </p>
          ) : (
            <div className="flex flex-col">
              {results.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  projects={projects}
                  draggable={false}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onSnooze={onSnooze}
                  onAddSubtask={onAddSubtask}
                  onEdit={onEditTask}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
