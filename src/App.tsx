import { useEffect, useRef, useState } from 'react'
import { QuickAdd } from './components/QuickAdd'
import { HomeView } from './components/HomeView'
import { TodayView } from './components/TodayView'
import { UpcomingView } from './components/UpcomingView'
import { CalendarView } from './components/CalendarView'
import { ProjectView } from './components/ProjectView'
import { Sidebar } from './components/Sidebar'
import { ThemeToggle } from './components/ThemeToggle'
import { Toast } from './components/Toast'
import { TaskEditModal } from './components/TaskEditModal'
import { useTasks } from './lib/useTasks'
import { useProjects } from './lib/useProjects'
import { useTheme } from './lib/useTheme'
import { useQuickAddShortcut } from './lib/useQuickAddShortcut'
import { parseQuickAdd, type ParsedQuickAdd, type QuickAddSubmission } from './lib/parseQuickAdd'
import { readSharedText } from './lib/shareTarget'
import { syncReminders } from './lib/push'
import { getStoredSyncCode, pullSync, pushSync } from './lib/sync'
import type { Task } from './types'
import type { ViewState } from './lib/viewState'

interface ToastState {
  id: number
  message: string
  onUndo: () => void
}

const TOAST_DURATION_MS = 4500

function App() {
  const { tasks, addTask, updateTask, toggleTask, deleteTask, restoreTasks, replaceAllTasks } = useTasks()
  const { projects, resolveProjectPath, replaceAllProjects } = useProjects()
  const { pref, setTheme } = useTheme()
  const [view, setView] = useState<ViewState>({ kind: 'home' })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [syncing, setSyncing] = useState(false)
  const quickAddRef = useRef<HTMLInputElement>(null)

  useQuickAddShortcut(quickAddRef)

  useEffect(() => {
    const shared = readSharedText()
    if (!shared) return
    const parsed = parseQuickAdd(shared)
    const projectId = parsed.projectPath ? resolveProjectPath(parsed.projectPath) : null
    addTask({ title: parsed.title, date: parsed.date, tags: parsed.tags, recurrence: parsed.recurrence, projectId })
    // deliberately run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    syncReminders(tasks)
  }, [tasks])

  useEffect(() => {
    const code = getStoredSyncCode()
    if (!code) return
    setSyncing(true)
    pullSync(code).then((data) => {
      if (data) {
        replaceAllTasks(data.tasks)
        replaceAllProjects(data.projects)
      }
      setSyncing(false)
    })
    // deliberately run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const code = getStoredSyncCode()
    if (!code) return
    pushSync(code, tasks, projects)
  }, [tasks, projects])

  function handleAdd(submission: QuickAddSubmission) {
    const projectId = submission.projectId ?? (submission.projectPath ? resolveProjectPath(submission.projectPath) : null)
    addTask({
      title: submission.title,
      date: submission.date,
      time: submission.time,
      projectId,
      priority: submission.priority,
      tags: submission.tags,
      reminders: submission.reminders,
      note: submission.note,
      recurrence: submission.recurrence,
    })
  }

  function handleAddSubtask(parentId: string, parsed: ParsedQuickAdd) {
    const projectId = parsed.projectPath ? resolveProjectPath(parsed.projectPath) : null
    addTask({
      title: parsed.title,
      date: parsed.date,
      tags: parsed.tags,
      recurrence: parsed.recurrence,
      projectId,
      parentId,
    })
  }

  function handleToggle(id: string) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    const willComplete = !task.done
    const spawnId = willComplete && task.recurrence && task.date ? crypto.randomUUID() : undefined

    toggleTask(id, spawnId)
    if (!willComplete) return

    setToast({
      id: Date.now(),
      message: 'Done.',
      onUndo: () => {
        toggleTask(id)
        if (spawnId) deleteTask(spawnId)
        setToast(null)
      },
    })
  }

  function handleDelete(id: string) {
    const removed = tasks.filter((t) => t.id === id || t.parentId === id)
    if (removed.length === 0) return

    deleteTask(id)
    if (editingTask && (editingTask.id === id || editingTask.parentId === id)) setEditingTask(null)
    setToast({
      id: Date.now(),
      message: 'Deleted.',
      onUndo: () => {
        restoreTasks(removed)
        setToast(null)
      },
    })
  }

  function navigate(next: ViewState) {
    setView(next)
    setMobileMenuOpen(false)
  }

  function renderMain() {
    switch (view.kind) {
      case 'home':
        return (
          <HomeView
            tasks={tasks}
            projects={projects}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onAddSubtask={handleAddSubtask}
            onEditTask={setEditingTask}
          />
        )
      case 'today':
        return (
          <TodayView
            tasks={tasks}
            projects={projects}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onAddSubtask={handleAddSubtask}
            onEditTask={setEditingTask}
          />
        )
      case 'upcoming':
        return (
          <UpcomingView
            tasks={tasks}
            projects={projects}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onAddSubtask={handleAddSubtask}
            onEditTask={setEditingTask}
          />
        )
      case 'calendar':
        return (
          <CalendarView
            tasks={tasks}
            projects={projects}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onAddSubtask={handleAddSubtask}
            onEditTask={setEditingTask}
          />
        )
      case 'project': {
        const project = projects.find((p) => p.id === view.projectId)
        if (!project) return null
        return (
          <ProjectView
            project={project}
            tasks={tasks}
            projects={projects}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onAddSubtask={handleAddSubtask}
            onEditTask={setEditingTask}
          />
        )
      }
    }
  }

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-56 shrink-0 border-r border-ink/10 sm:block dark:border-white/10">
        <Sidebar
          projects={projects}
          tasks={tasks}
          view={view}
          onNavigate={navigate}
          onReplaceTasks={replaceAllTasks}
          onReplaceProjects={replaceAllProjects}
        />
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-ink/40 dark:bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative z-10 h-full w-64 bg-cream shadow-xl dark:bg-cream-dark">
            <Sidebar
          projects={projects}
          tasks={tasks}
          view={view}
          onNavigate={navigate}
          onReplaceTasks={replaceAllTasks}
          onReplaceProjects={replaceAllProjects}
        />
          </aside>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-10 pt-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="text-xl text-ink/60 sm:hidden dark:text-ink-dark/60"
          >
            ☰
          </button>
          {syncing && <p className="text-xs text-ink/40 dark:text-ink-dark/40">syncing…</p>}
          <ThemeToggle pref={pref} onChange={setTheme} />
        </div>

        <div className="mb-8">
          <QuickAdd ref={quickAddRef} projects={projects} onAdd={handleAdd} />
        </div>

        <main className="flex-1">{renderMain()}</main>

        {toast && <Toast key={toast.id} message={toast.message} onUndo={toast.onUndo} />}

        {editingTask && (
          <TaskEditModal
            task={editingTask}
            projects={projects}
            onClose={() => setEditingTask(null)}
            onChange={(id, changes) => {
              updateTask(id, changes)
              setEditingTask((prev) => (prev && prev.id === id ? { ...prev, ...changes } : prev))
            }}
            onDelete={handleDelete}
            onResolveProject={resolveProjectPath}
          />
        )}
      </div>
    </div>
  )
}

export default App
