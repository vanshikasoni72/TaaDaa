import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { QuickAdd } from './components/QuickAdd'
import { InboxView } from './components/InboxView'
import { TodayView } from './components/TodayView'
import { UpcomingView } from './components/UpcomingView'
import { CalendarView } from './components/CalendarView'
import { CompletedView } from './components/CompletedView'
import { ProjectView } from './components/ProjectView'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/Toast'
import { TaskEditModal } from './components/TaskEditModal'
import { NeonSnakeModal } from './components/NeonSnakeModal'
import { TetrisModal } from './components/TetrisModal'
import { ListsDrawer } from './components/ListsDrawer'
import { SearchOverlay } from './components/SearchOverlay'
import { SnakeIcon, TetrisIcon, ListsIcon, SearchIcon } from './components/icons'
import { useTasks } from './lib/useTasks'
import { useProjects } from './lib/useProjects'
import { useLists } from './lib/useLists'
import { useTheme } from './lib/useTheme'
import { useQuickAddShortcut } from './lib/useQuickAddShortcut'
import { parseQuickAdd, type ParsedQuickAdd, type QuickAddSubmission } from './lib/parseQuickAdd'
import { readSharedText } from './lib/shareTarget'
import { syncReminders } from './lib/push'
import { getStoredSyncCode, pullSync, pushSync } from './lib/sync'
import { todayIso } from './lib/date'
import { TAG_COLORS } from './lib/tags'
import type { Task } from './types'
import type { ViewState } from './lib/viewState'

interface ToastState {
  id: number
  message: string
  onUndo?: () => void
}

const TOAST_DURATION_MS = 4500
// A push waits this long after the last tasks/projects change before actually
// firing — editing a task's title/note auto-saves on every keystroke
// (TaskEditModal), which used to mean one full sync POST per keystroke.
const SYNC_DEBOUNCE_MS = 1500
const SYNC_RETRY_MS = 15000

function App() {
  const {
    tasks,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    restoreTasks,
    replaceAllTasks,
    unassignProject,
    reorderTasks,
  } = useTasks()
  const { projects, resolveProjectPath, deleteProject, addProject, renameProject, replaceAllProjects } =
    useProjects()
  const { lists, addList, renameList, deleteList, addItem: addListItem, toggleItem: toggleListItem, clearChecked: clearCheckedListItems, replaceAllLists } =
    useLists()
  const { pref, setTheme } = useTheme()
  const [view, setView] = useState<ViewState>({ kind: 'today' })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayIso())
  const [isSnakeOpen, setIsSnakeOpen] = useState(false)
  const [isTetrisOpen, setIsTetrisOpen] = useState(false)
  const [isListsOpen, setIsListsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const quickAddRef = useRef<HTMLInputElement>(null)
  // Dragging a task onto a calendar day sets its work-on date, or (holding
  // Shift through the drop) its due date instead — mirrors the modifier-key
  // convention from the spec. DragEndEvent has no reliable modifier-key
  // field of its own, so this ref is kept current by plain window listeners.
  const shiftHeldRef = useRef(false)

  useQuickAddShortcut(quickAddRef)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Shift') shiftHeldRef.current = true
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'Shift') shiftHeldRef.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const existingTags = useMemo(() => {
    const used = new Set(tasks.flatMap((t) => t.tags))
    for (const known of Object.keys(TAG_COLORS)) used.add(known)
    return Array.from(used).sort()
  }, [tasks])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const taskId = String(active.id)
    const overData = over.data.current as
      | { type: 'calendar-day'; dateIso: string }
      | { type: 'sidebar-project'; projectId: string }
      | undefined

    if (overData?.type === 'calendar-day') {
      updateTask(taskId, shiftHeldRef.current ? { dueDate: overData.dateIso } : { date: overData.dateIso })
      return
    }
    if (overData?.type === 'sidebar-project') {
      updateTask(taskId, { projectId: overData.projectId })
      return
    }

    // Otherwise, if both sides belong to the same SortableContext, this is a
    // same-list reorder — persist the new order via each task's `order` field.
    const activeSortable = (active.data.current as { sortable?: { items: string[] } } | undefined)?.sortable
    const overSortable = (over.data.current as { sortable?: { items: string[] } } | undefined)?.sortable
    if (activeSortable && overSortable && active.id !== over.id) {
      const items = activeSortable.items
      const oldIndex = items.indexOf(taskId)
      const newIndex = items.indexOf(String(over.id))
      if (oldIndex === -1 || newIndex === -1) return
      reorderTasks(arrayMove(items, oldIndex, newIndex))
    }
  }

  useEffect(() => {
    const shared = readSharedText()
    if (!shared) return
    const parsed = parseQuickAdd(shared)
    const projectId = parsed.projectPath ? resolveProjectPath(parsed.projectPath) : null
    addTask({
      title: parsed.title,
      date: parsed.date,
      time: parsed.time,
      priority: parsed.priority,
      tags: parsed.tags,
      recurrence: parsed.recurrence,
      projectId,
    })
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

  // Gates the push effect below until the initial pull attempt (if any) has
  // resolved. Without this, both effects fire on mount: the push effect would
  // fire immediately with whatever stale local tasks/projects this device
  // already had in localStorage, racing the pull's own in-flight fetch — if
  // that push reached the server first, it silently clobbered another
  // device's already-synced data before this device even downloaded it.
  // That race is what caused "some tasks are randomly missing."
  const [syncReady, setSyncReady] = useState(false)
  // 'idle' covers both "never synced" and "synced fine" — the indicator only
  // has something to say while a push is in flight or has failed, matching
  // the app's general "no UI chrome unless it's saying something" instinct.
  // An error stays visible (and keeps quietly retrying in the background)
  // until it resolves, instead of being swallowed the way pushSync/pullSync's
  // own try/catch silently swallow a failed fetch.
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')
  const tasksRef = useRef(tasks)
  const projectsRef = useRef(projects)
  const listsRef = useRef(lists)
  useEffect(() => {
    tasksRef.current = tasks
    projectsRef.current = projects
    listsRef.current = lists
  })
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Stable across renders (refs carry the current data) so both the debounce
  // effect and the online-reconnect handler below can share one push+retry
  // implementation instead of duplicating it.
  const attemptPush = useCallback(() => {
    const code = getStoredSyncCode()
    if (!code) return
    clearTimeout(pushTimerRef.current)
    setSyncStatus('syncing')
    pushSync(code, tasksRef.current, projectsRef.current, listsRef.current).then((ok) => {
      if (ok) {
        setSyncStatus('idle')
      } else {
        setSyncStatus('error')
        pushTimerRef.current = setTimeout(attemptPush, SYNC_RETRY_MS)
      }
    })
  }, [])

  useEffect(() => {
    const code = getStoredSyncCode()
    if (!code) {
      setSyncReady(true)
      return
    }
    setSyncing(true)
    pullSync(code).then((data) => {
      if (data) {
        replaceAllTasks(data.tasks)
        replaceAllProjects(data.projects)
        replaceAllLists(data.lists ?? [])
      } else {
        setSyncStatus('error')
      }
      setSyncing(false)
      setSyncReady(true)
    })
    // deliberately run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Every tasks/projects change schedules a push after a short idle window
  // rather than firing immediately — editing a task's title/note auto-saves
  // on every keystroke (TaskEditModal calls onChange, not onBlur), which used
  // to mean one full sync POST per keystroke while typing.
  useEffect(() => {
    if (!syncReady) return
    if (!getStoredSyncCode()) return
    clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(attemptPush, SYNC_DEBOUNCE_MS)
    return () => clearTimeout(pushTimerRef.current)
  }, [tasks, projects, lists, syncReady, attemptPush])

  // The app itself already works offline (tasks/projects live in
  // localStorage, and the service worker precaches the shell), but a push
  // sync attempt made *while offline* just fails silently and never retries
  // on its own — nothing was watching for connectivity to return. This picks
  // that back up the moment the browser reports it's online again, bypassing
  // the debounce above since a reconnect is a deliberate one-off trigger, not
  // a burst of edits to batch.
  useEffect(() => {
    function handleOnline() {
      syncReminders(tasksRef.current)
      attemptPush()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [attemptPush])

  function handleAdd(submission: QuickAddSubmission) {
    const projectId =
      submission.projectId ??
      (submission.projectPath ? resolveProjectPath(submission.projectPath) : null) ??
      (view.kind === 'project' ? view.projectId : null)
    // A day selected on the calendar becomes the new task's deadline, not its
    // work-on date — the calendar is date-driven, but "I clicked this day and
    // added a task" reads as "this is due then," not "work on this then."
    const dueDate = submission.dueDate ?? (view.kind === 'calendar' ? selectedCalendarDate : null)
    addTask({
      title: submission.title,
      date: submission.date,
      time: submission.time,
      dueDate,
      projectId,
      priority: submission.priority,
      tags: submission.tags,
      reminders: submission.reminders,
      note: submission.note,
      recurrence: submission.recurrence,
    })
  }

  function handleCommand(cmd: 'snake' | 'tetris') {
    if (window.innerWidth < 768) {
      setToast({ id: Date.now(), message: 'Desktop feature only' })
      return
    }
    if (cmd === 'snake') setIsSnakeOpen(true)
    else setIsTetrisOpen(true)
  }

  function handleAddSubtask(parentId: string, parsed: ParsedQuickAdd) {
    const projectId = parsed.projectPath ? resolveProjectPath(parsed.projectPath) : null
    addTask({
      title: parsed.title,
      date: parsed.date,
      time: parsed.time,
      dueDate: parsed.dueDate,
      priority: parsed.priority,
      tags: parsed.tags,
      recurrence: parsed.recurrence,
      projectId,
      parentId,
    })
  }

  function handleDeleteProject(id: string) {
    const project = projects.find((p) => p.id === id)
    if (!project) return
    const confirmed = window.confirm(
      project.parentId
        ? `Delete "${project.name}"? Its tasks stay, just unfiled.`
        : `Delete "${project.name}" and any of its sub-categories? Their tasks stay, just unfiled.`,
    )
    if (!confirmed) return
    const affectedIds = project.parentId
      ? [id]
      : [id, ...projects.filter((p) => p.parentId === id).map((p) => p.id)]
    unassignProject(affectedIds)
    deleteProject(id)
    if (view.kind === 'project' && affectedIds.includes(view.projectId)) setView({ kind: 'today' })
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

  function handleSnooze(id: string, days: 1 | 7) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const next = new Date()
    next.setDate(next.getDate() + days)
    const y = next.getFullYear()
    const m = String(next.getMonth() + 1).padStart(2, '0')
    const d = String(next.getDate()).padStart(2, '0')
    updateTask(id, { date: `${y}-${m}-${d}` })
    setToast({
      id: Date.now(),
      message: days === 1 ? 'Snoozed to tomorrow.' : 'Snoozed to next week.',
      onUndo: () => {
        updateTask(id, { date: task.date })
        setToast(null)
      },
    })
  }

  function navigate(next: ViewState) {
    setView(next)
    setMobileMenuOpen(false)
  }

  // Calendar needs real width for its grid; Today and Upcoming both have a
  // two-column tasks/deadlines split that wants more room than the other,
  // single-column list views get.
  function containerWidthClass(kind: ViewState['kind']) {
    if (kind === 'calendar') return 'max-w-5xl'
    if (kind === 'today' || kind === 'upcoming') return 'max-w-3xl'
    return 'max-w-xl'
  }

  function renderMain() {
    switch (view.kind) {
      case 'inbox':
        return (
          <InboxView
            tasks={tasks}
            projects={projects}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onSnooze={handleSnooze}
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
            onSnooze={handleSnooze}
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
            onSnooze={handleSnooze}
            onAddSubtask={handleAddSubtask}
            onEditTask={setEditingTask}
          />
        )
      case 'calendar':
        return (
          <CalendarView
            tasks={tasks}
            projects={projects}
            selected={selectedCalendarDate}
            onSelectDate={setSelectedCalendarDate}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onSnooze={handleSnooze}
            onAddSubtask={handleAddSubtask}
            onEditTask={setEditingTask}
          />
        )
      case 'completed':
        return (
          <CompletedView
            tasks={tasks}
            projects={projects}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onSnooze={handleSnooze}
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
            onSnooze={handleSnooze}
            onAddSubtask={handleAddSubtask}
            onEditTask={setEditingTask}
          />
        )
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
    <div className="flex h-svh overflow-hidden">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-sidebar sm:block">
        <Sidebar
          projects={projects}
          tasks={tasks}
          view={view}
          onNavigate={navigate}
          lists={lists}
          onReplaceTasks={replaceAllTasks}
          onReplaceProjects={replaceAllProjects}
          onReplaceLists={replaceAllLists}
          onAddProject={addProject}
          onRenameProject={renameProject}
          onDeleteProject={handleDeleteProject}
          themePref={pref}
          onThemeChange={setTheme}
        />
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-ink/40 dark:bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative z-10 h-full w-64 bg-sidebar shadow-xl">
            <Sidebar
              projects={projects}
              tasks={tasks}
              view={view}
              onNavigate={navigate}
              lists={lists}
              onReplaceTasks={replaceAllTasks}
              onReplaceProjects={replaceAllProjects}
              onReplaceLists={replaceAllLists}
              onAddProject={addProject}
              onRenameProject={renameProject}
              onDeleteProject={handleDeleteProject}
              themePref={pref}
              onThemeChange={setTheme}
            />
          </aside>
        </div>
      )}

      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className={`mx-auto w-full min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-8 sm:px-6 ${containerWidthClass(view.kind)}`}>
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="text-xl text-ink/60 sm:hidden dark:text-ink-dark/60"
            >
              ☰
            </button>
            <div className="ml-auto flex items-center gap-2">
              {(syncing || syncStatus === 'syncing') && (
                <p className="text-xs text-ink/40 dark:text-ink-dark/40">syncing…</p>
              )}
              {!syncing && syncStatus === 'error' && (
                <p className="text-xs text-magenta">sync failed, retrying…</p>
              )}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search tasks"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/40 transition-colors duration-150 hover:bg-ink/5 hover:text-ink/70 dark:text-ink-dark/40 dark:hover:bg-white/5 dark:hover:text-ink-dark/70"
              >
                <SearchIcon />
              </button>
              <button
                type="button"
                onClick={() => setIsListsOpen(true)}
                aria-label="Open lists"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/40 transition-colors duration-150 hover:bg-ink/5 hover:text-ink/70 dark:text-ink-dark/40 dark:hover:bg-white/5 dark:hover:text-ink-dark/70"
              >
                <ListsIcon />
              </button>
              <button
                type="button"
                onClick={() => handleCommand('snake')}
                aria-label="Play Snake"
                className="hidden h-8 w-8 items-center justify-center rounded-lg text-raspberry/70 transition-colors duration-150 hover:bg-ink/5 hover:text-raspberry sm:flex dark:hover:bg-white/5"
              >
                <SnakeIcon />
              </button>
              <button
                type="button"
                onClick={() => handleCommand('tetris')}
                aria-label="Play Tetris"
                className="hidden h-8 w-8 items-center justify-center rounded-lg text-ink/40 transition-colors duration-150 hover:bg-ink/5 sm:flex dark:hover:bg-white/5"
              >
                <TetrisIcon />
              </button>
            </div>
          </div>

          <main>{renderMain()}</main>

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

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-cream/95 px-4 py-3 backdrop-blur-sm sm:left-56 sm:px-6 dark:border-white/[0.08] dark:bg-cream-dark/85 dark:backdrop-blur-lg">
          <div className={`mx-auto w-full ${containerWidthClass(view.kind)}`}>
            <QuickAdd
              ref={quickAddRef}
              projects={projects}
              existingTags={existingTags}
              onAdd={handleAdd}
              onCommand={handleCommand}
            />
          </div>
        </div>

        {toast && <Toast key={toast.id} message={toast.message} onUndo={toast.onUndo} />}
      </div>

      {isSnakeOpen && <NeonSnakeModal onClose={() => setIsSnakeOpen(false)} />}
      {isTetrisOpen && <TetrisModal onClose={() => setIsTetrisOpen(false)} />}
      {isListsOpen && (
        <ListsDrawer
          lists={lists}
          addList={addList}
          renameList={renameList}
          deleteList={deleteList}
          addItem={addListItem}
          toggleItem={toggleListItem}
          clearChecked={clearCheckedListItems}
          onClose={() => setIsListsOpen(false)}
        />
      )}
      {isSearchOpen && (
        <SearchOverlay
          tasks={tasks}
          projects={projects}
          onClose={() => setIsSearchOpen(false)}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onSnooze={handleSnooze}
          onAddSubtask={handleAddSubtask}
          onEditTask={setEditingTask}
        />
      )}
    </div>
    </DndContext>
  )
}

export default App
