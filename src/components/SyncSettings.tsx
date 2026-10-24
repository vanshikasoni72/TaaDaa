import { useState } from 'react'
import type { Project, Task, TaskList } from '../types'
import {
  generateSyncCode,
  getStoredSyncCode,
  isSyncConfigured,
  pullSync,
  pushSync,
  setStoredSyncCode,
  setSyncBase,
} from '../lib/sync'

interface SyncSettingsProps {
  tasks: Task[]
  projects: Project[]
  lists: TaskList[]
  onReplaceTasks: (tasks: Task[]) => void
  onReplaceProjects: (projects: Project[]) => void
  onReplaceLists: (lists: TaskList[]) => void
}

export function SyncSettings({
  tasks,
  projects,
  lists,
  onReplaceTasks,
  onReplaceProjects,
  onReplaceLists,
}: SyncSettingsProps) {
  const [code, setCode] = useState(getStoredSyncCode())
  const [joining, setJoining] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isSyncConfigured()) return null

  async function handleGenerate() {
    setBusy(true)
    setError(null)
    const newCode = generateSyncCode()
    const result = await pushSync(newCode, tasks, projects, lists, null)
    setBusy(false)
    if (result.status !== 'ok') {
      setError("couldn't reach the sync server")
      return
    }
    setSyncBase({ updatedAt: result.updatedAt, tasks, projects, lists })
    setStoredSyncCode(newCode)
    setCode(newCode)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = joinInput.trim().toUpperCase()
    if (!trimmed) return
    if (
      !window.confirm(
        'This replaces the tasks, projects, and lists on this device with whatever is saved under that code. Continue?',
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    const pulled = await pullSync(trimmed)
    setBusy(false)
    if (pulled.status !== 'ok') {
      setError(pulled.status === 'missing' ? "couldn't find that code" : "couldn't reach the sync server")
      return
    }
    const { data } = pulled
    onReplaceTasks(data.tasks)
    onReplaceProjects(data.projects)
    onReplaceLists(data.lists ?? [])
    setSyncBase({ updatedAt: data.updatedAt, tasks: data.tasks, projects: data.projects, lists: data.lists ?? [] })
    setStoredSyncCode(trimmed)
    setCode(trimmed)
    setJoining(false)
  }

  function handleLeave() {
    setStoredSyncCode(null)
    setSyncBase(null)
    setCode(null)
  }

  return (
    <div className="flex flex-col gap-1 px-3 text-xs">
      {code ? (
        <>
          <p className="text-ink/50 dark:text-ink-dark/50">
            sync code: <span className="font-mono font-semibold text-raspberry">{code}</span>
          </p>
          <button
            type="button"
            onClick={handleLeave}
            className="self-start text-[10px] text-ink/30 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/30"
          >
            stop syncing this device
          </button>
        </>
      ) : joining ? (
        <form onSubmit={handleJoin} className="flex flex-col gap-1.5">
          <input
            type="text"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            placeholder="enter code"
            autoFocus
            className="rounded-lg border border-ink/10 bg-white/60 px-2 py-1 text-xs uppercase tracking-wide text-ink outline-none focus:border-raspberry/40 dark:border-white/10 dark:bg-white/5 dark:text-ink-dark"
          />
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="font-medium text-raspberry">
              join
            </button>
            <button
              type="button"
              onClick={() => {
                setJoining(false)
                setError(null)
              }}
              className="text-ink/40 dark:text-ink-dark/40"
            >
              cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy}
            className="text-ink/50 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/50"
          >
            sync this device
          </button>
          <button
            type="button"
            onClick={() => setJoining(true)}
            className="text-ink/50 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/50"
          >
            have a code?
          </button>
        </div>
      )}
      {error && <p className="text-[10px] text-magenta">{error}</p>}
    </div>
  )
}
