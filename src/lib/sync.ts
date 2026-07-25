import type { Project, Task, TaskList } from '../types'

const PUSH_API_URL = import.meta.env.VITE_PUSH_API_URL as string | undefined
const STORAGE_KEY = 'taadaa.syncCode'

// No 0/O/1/I/L — easy to read and type between devices.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateSyncCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export function isSyncConfigured(): boolean {
  return Boolean(PUSH_API_URL)
}

export function getStoredSyncCode(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setStoredSyncCode(code: string | null) {
  if (code) localStorage.setItem(STORAGE_KEY, code)
  else localStorage.removeItem(STORAGE_KEY)
}

export interface SyncData {
  tasks: Task[]
  projects: Project[]
  /** Absent on a blob pushed before Lists synced — treat the same as an empty array. */
  lists?: TaskList[]
  updatedAt: string
}

/** Whole-blob replace — simplest sync model, no field-level merge. Last push wins. */
export async function pushSync(code: string, tasks: Task[], projects: Project[], lists: TaskList[]): Promise<boolean> {
  if (!PUSH_API_URL) return false
  try {
    const res = await fetch(`${PUSH_API_URL}/api/sync/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, projects, lists }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function pullSync(code: string): Promise<SyncData | null> {
  if (!PUSH_API_URL) return null
  try {
    const res = await fetch(`${PUSH_API_URL}/api/sync/${code}`)
    if (!res.ok) return null
    return (await res.json()) as SyncData
  } catch {
    return null
  }
}
