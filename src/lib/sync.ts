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

export type PushResult =
  | { status: 'ok'; updatedAt: string }
  /** The server's copy moved on since `baseUpdatedAt` — merge with `current` and retry. */
  | { status: 'conflict'; current: SyncData }
  | { status: 'error' }

/**
 * Whole-blob replace, but only if the server's copy is still the version this
 * device last saw (`baseUpdatedAt`, null if it has never seen one) — otherwise
 * the server answers with its newer copy instead of being overwritten.
 */
export async function pushSync(
  code: string,
  tasks: Task[],
  projects: Project[],
  lists: TaskList[],
  baseUpdatedAt: string | null,
): Promise<PushResult> {
  if (!PUSH_API_URL) return { status: 'error' }
  try {
    const res = await fetch(`${PUSH_API_URL}/api/sync/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, projects, lists, baseUpdatedAt }),
    })
    if (res.status === 409) return { status: 'conflict', current: (await res.json()).current as SyncData }
    if (!res.ok) return { status: 'error' }
    return { status: 'ok', updatedAt: (await res.json()).updatedAt as string }
  } catch {
    return { status: 'error' }
  }
}

export type PullResult =
  | { status: 'ok'; data: SyncData }
  /** Nothing stored under this code (e.g. the server lost its data). */
  | { status: 'missing' }
  | { status: 'error' }

export async function pullSync(code: string): Promise<PullResult> {
  if (!PUSH_API_URL) return { status: 'error' }
  try {
    const res = await fetch(`${PUSH_API_URL}/api/sync/${code}`)
    if (res.status === 404) return { status: 'missing' }
    if (!res.ok) return { status: 'error' }
    return { status: 'ok', data: (await res.json()) as SyncData }
  } catch {
    return { status: 'error' }
  }
}

const BASE_KEY = 'taadaa.syncBase'

/**
 * The last copy this device and the server agreed on. Comparing against it is
 * what lets a merge tell "this device changed it" apart from "the other
 * device changed it" without any per-task timestamps.
 */
export interface SyncBase {
  updatedAt: string
  tasks: Task[]
  projects: Project[]
  lists: TaskList[]
}

export function getSyncBase(): SyncBase | null {
  try {
    const raw = localStorage.getItem(BASE_KEY)
    return raw ? (JSON.parse(raw) as SyncBase) : null
  } catch {
    return null
  }
}

export function setSyncBase(base: SyncBase | null) {
  try {
    if (base) localStorage.setItem(BASE_KEY, JSON.stringify(base))
    else localStorage.removeItem(BASE_KEY)
  } catch {
    // storage full — next sync just falls back to a base-less merge
  }
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Three-way merge of two id-keyed arrays against their common ancestor.
 * Per item: whichever side changed it wins; if both did, `local` wins (it's
 * the edit the user just made here). Deletions on either side stick unless the
 * other side edited the item meanwhile. With no base at all, it's a union
 * where `remote` wins on shared items — the server is the safer default when
 * there's nothing to tell who changed what.
 */
function mergeById<T extends { id: string }>(
  base: T[] | null,
  local: T[],
  remote: T[],
  mergeBoth?: (b: T, l: T, r: T) => T,
): T[] {
  const baseById = new Map((base ?? []).map((x) => [x.id, x]))
  const localById = new Map(local.map((x) => [x.id, x]))
  const remoteById = new Map(remote.map((x) => [x.id, x]))
  const ids = [...remote.map((x) => x.id), ...local.filter((x) => !remoteById.has(x.id)).map((x) => x.id)]

  const out: T[] = []
  for (const id of ids) {
    const b = baseById.get(id)
    const l = localById.get(id)
    const r = remoteById.get(id)
    if (l && r) {
      if (!base) out.push(r)
      else if (b && sameJson(l, b)) out.push(r)
      else if (b && sameJson(r, b)) out.push(l)
      else out.push(b && mergeBoth ? mergeBoth(b, l, r) : l)
    } else if (l) {
      // only here: new locally, or deleted remotely (drop unless edited here since)
      if (!b || !sameJson(l, b)) out.push(l)
    } else if (r) {
      // only on the server: new remotely, or deleted here (drop unless edited there since)
      if (!b || !sameJson(r, b)) out.push(r)
    }
  }
  return out
}

export function mergeSyncData(
  base: SyncBase | null,
  local: { tasks: Task[]; projects: Project[]; lists: TaskList[] },
  remote: SyncData,
) {
  return {
    tasks: mergeById(base?.tasks ?? null, local.tasks, remote.tasks),
    projects: mergeById(base?.projects ?? null, local.projects, remote.projects),
    // Both devices touching the same list (e.g. each ticking a different
    // item) is common enough to merge at the item level too.
    lists: mergeById(base?.lists ?? null, local.lists, remote.lists ?? [], (b, l, r) => ({
      ...l,
      items: mergeById(b.items, l.items, r.items),
    })),
  }
}

export function sameSyncContent(
  a: { tasks: Task[]; projects: Project[]; lists: TaskList[] },
  b: { tasks: Task[]; projects: Project[]; lists?: TaskList[] },
): boolean {
  return sameJson(a.tasks, b.tasks) && sameJson(a.projects, b.projects) && sameJson(a.lists, b.lists ?? [])
}
