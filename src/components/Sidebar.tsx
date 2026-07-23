import { useState } from 'react'
import type { Project, Task } from '../types'
import { displayColorFor } from '../lib/projectColors'
import type { ViewState } from '../lib/viewState'
import type { ThemePref } from '../lib/theme'
import { NotificationToggle } from './NotificationToggle'
import { SyncSettings } from './SyncSettings'
import { ThemeToggle } from './ThemeToggle'
import { exportData } from '../lib/exportData'

interface SidebarProps {
  projects: Project[]
  tasks: Task[]
  view: ViewState
  onNavigate: (view: ViewState) => void
  onReplaceTasks: (tasks: Task[]) => void
  onReplaceProjects: (projects: Project[]) => void
  onAddProject: (name: string) => void
  onRenameProject: (id: string, name: string) => void
  onDeleteProject: (id: string) => void
  themePref: ThemePref
  onThemeChange: (pref: ThemePref) => void
}

const PINNED: { label: string; view: ViewState }[] = [
  { label: 'Inbox', view: { kind: 'inbox' } },
  { label: 'Home', view: { kind: 'home' } },
  { label: 'Today', view: { kind: 'today' } },
  { label: 'Upcoming', view: { kind: 'upcoming' } },
  { label: 'Calendar', view: { kind: 'calendar' } },
]

function isSameView(a: ViewState, b: ViewState): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'project' && b.kind === 'project') return a.projectId === b.projectId
  return true
}

export function Sidebar({
  projects,
  tasks,
  view,
  onNavigate,
  onReplaceTasks,
  onReplaceProjects,
  onAddProject,
  onRenameProject,
  onDeleteProject,
  themePref,
  onThemeChange,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [addingProject, setAddingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const topLevel = projects.filter((p) => p.parentId === null)
  const countFor = (projectId: string) => tasks.filter((t) => t.projectId === projectId && !t.done).length

  function startRename(project: Project) {
    setRenamingId(project.id)
    setRenameValue(project.name)
  }

  function commitRename() {
    if (renamingId) onRenameProject(renamingId, renameValue)
    setRenamingId(null)
    setRenameValue('')
  }

  function submitNewProject(e: React.FormEvent) {
    e.preventDefault()
    if (newProjectName.trim()) onAddProject(newProjectName)
    setNewProjectName('')
    setAddingProject(false)
  }

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-6">
      <div className="px-3 font-serif text-lg italic text-wordmark">TaaDaa</div>

      <div className="flex flex-col gap-0.5">
        {PINNED.map(({ label, view: linkView }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(linkView)}
            className={`rounded-lg px-3 py-1.5 text-left text-sm transition-colors duration-150 ${
              isSameView(view, linkView)
                ? 'bg-raspberry/15 font-medium text-raspberry'
                : 'text-ink/70 hover:bg-ink/5 dark:text-ink-dark/70 dark:hover:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between px-3">
          <h2 className="text-xs uppercase tracking-wide text-ink/35 dark:text-ink-dark/35">Projects</h2>
          <button
            type="button"
            onClick={() => setAddingProject((v) => !v)}
            aria-label="Add project"
            className="text-xs text-ink/35 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/35"
          >
            + add
          </button>
        </div>

        {addingProject && (
          <form onSubmit={submitNewProject} className="mb-1 px-3">
            <input
              autoFocus
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onBlur={() => {
                if (!newProjectName.trim()) setAddingProject(false)
              }}
              placeholder="project name…"
              className="w-full rounded-lg border border-ink/10 bg-white/60 px-2 py-1 text-sm text-ink outline-none focus:border-raspberry/40 dark:border-border dark:bg-transparent dark:text-ink-dark"
            />
          </form>
        )}

        <div className="flex flex-col gap-0.5">
          {topLevel.map((project) => {
            const subs = projects.filter((p) => p.parentId === project.id)
            const isExpanded = expanded[project.id] ?? false
            const isActive = view.kind === 'project' && view.projectId === project.id

            return (
              <div key={project.id}>
                <div className="group flex items-center">
                  {subs.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => ({ ...prev, [project.id]: !isExpanded }))}
                      aria-label={isExpanded ? `Collapse ${project.name}` : `Expand ${project.name}`}
                      className="w-5 shrink-0 text-ink/30 transition-transform duration-150 dark:text-ink-dark/30"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      ›
                    </button>
                  ) : (
                    <span className="w-5 shrink-0" />
                  )}

                  {renamingId === project.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                      className="w-full flex-1 rounded-lg border border-raspberry/40 bg-white/60 px-2 py-1 text-sm text-ink outline-none dark:bg-transparent dark:text-ink-dark"
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onNavigate({ kind: 'project', projectId: project.id })}
                        className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors duration-150 ${
                          isActive
                            ? 'bg-raspberry/15 font-medium text-raspberry'
                            : 'text-ink/70 hover:bg-ink/5 dark:text-ink-dark/70 dark:hover:bg-white/5'
                        }`}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: displayColorFor(project) }}
                        />
                        <span className="flex-1 truncate">{project.name}</span>
                        {countFor(project.id) > 0 && (
                          <span className="text-xs text-ink/30 dark:text-ink-dark/30">{countFor(project.id)}</span>
                        )}
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startRename(project)}
                          aria-label={`Rename ${project.name}`}
                          className="px-1 text-xs text-ink/30 hover:text-rose dark:text-ink-dark/30"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProject(project.id)}
                          aria-label={`Delete ${project.name}`}
                          className="px-1 text-xs text-ink/30 hover:text-raspberry dark:text-ink-dark/30"
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {isExpanded && subs.length > 0 && (
                  <div className="ml-5 flex flex-col gap-0.5">
                    {subs.map((sub) => {
                      const subActive = view.kind === 'project' && view.projectId === sub.id
                      return (
                        <div key={sub.id} className="group flex items-center">
                          {renamingId === sub.id ? (
                            <input
                              autoFocus
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={commitRename}
                              onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                              className="w-full flex-1 rounded-lg border border-raspberry/40 bg-white/60 px-2 py-1 text-sm text-ink outline-none dark:bg-transparent dark:text-ink-dark"
                            />
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onNavigate({ kind: 'project', projectId: sub.id })}
                                className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors duration-150 ${
                                  subActive
                                    ? 'bg-raspberry/15 font-medium text-raspberry'
                                    : 'text-ink/60 hover:bg-ink/5 dark:text-ink-dark/60 dark:hover:bg-white/5'
                                }`}
                              >
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: displayColorFor(sub) }}
                                />
                                <span className="flex-1 truncate">{sub.name}</span>
                                {countFor(sub.id) > 0 && (
                                  <span className="text-xs text-ink/30 dark:text-ink-dark/30">{countFor(sub.id)}</span>
                                )}
                              </button>
                              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => startRename(sub)}
                                  aria-label={`Rename ${sub.name}`}
                                  className="px-1 text-xs text-ink/30 hover:text-rose dark:text-ink-dark/30"
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteProject(sub.id)}
                                  aria-label={`Delete ${sub.name}`}
                                  className="px-1 text-xs text-ink/30 hover:text-raspberry dark:text-ink-dark/30"
                                >
                                  ✕
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <SyncSettings
          tasks={tasks}
          projects={projects}
          onReplaceTasks={onReplaceTasks}
          onReplaceProjects={onReplaceProjects}
        />
        <NotificationToggle />
        <button
          type="button"
          onClick={() => exportData(tasks, projects)}
          className="self-start text-xs text-ink/50 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/50"
        >
          export data
        </button>
        <ThemeToggle pref={themePref} onChange={onThemeChange} />
      </div>
    </nav>
  )
}
