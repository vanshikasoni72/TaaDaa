import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'data.json')

// Render's free tier wipes the local disk on every restart/redeploy, which used
// to silently erase every sync blob, push subscription, and reminder. When
// Upstash credentials are set, the whole store is persisted there as one JSON
// value instead; data.json is only used for local dev (no credentials set).
//
// There's only ever one server process, so the in-memory copy is the source of
// truth and every read/write below stays synchronous — storage is just
// write-behind so the data survives a restart.
const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env
const useUpstash = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN)
const UPSTASH_KEY = 'taadaa:db'

let db = { subscriptions: [], reminders: [], sync: {} }

function normalize(data) {
  return {
    subscriptions: Array.isArray(data?.subscriptions) ? data.subscriptions : [],
    reminders: Array.isArray(data?.reminders) ? data.reminders : [],
    sync: data?.sync && typeof data.sync === 'object' ? data.sync : {},
  }
}

function readFile() {
  if (!existsSync(DB_PATH)) return null
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf-8'))
  } catch {
    return null
  }
}

async function upstash(command) {
  const res = await fetch(UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
  if (!res.ok) throw new Error(`upstash ${res.status}: ${await res.text()}`)
  return (await res.json()).result
}

/** Loads the store once at startup. Must resolve before the server starts handling requests. */
export async function initDb() {
  if (!useUpstash) {
    db = normalize(readFile())
    console.log('storage: local data.json (no Upstash credentials set — data will not survive a Render restart)')
    return
  }
  const raw = await upstash(['GET', UPSTASH_KEY])
  if (raw) {
    db = normalize(JSON.parse(raw))
  } else {
    // First boot against an empty Upstash database: carry over whatever the
    // old file store still has, so switching over doesn't start from nothing.
    db = normalize(readFile())
    await upstash(['SET', UPSTASH_KEY, JSON.stringify(db)])
  }
  console.log('storage: Upstash')
}

let writing = false
let dirty = false

async function flush() {
  if (writing) {
    dirty = true
    return
  }
  writing = true
  try {
    do {
      dirty = false
      try {
        await upstash(['SET', UPSTASH_KEY, JSON.stringify(db)])
      } catch (err) {
        console.error('failed to persist to Upstash, will retry', err.message)
        await new Promise((r) => setTimeout(r, 5000))
        dirty = true
      }
    } while (dirty)
  } finally {
    writing = false
  }
}

function save() {
  if (useUpstash) flush()
  else writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

export function upsertSubscription(subscription) {
  const idx = db.subscriptions.findIndex((s) => s.endpoint === subscription.endpoint)
  if (idx >= 0) {
    if (JSON.stringify(db.subscriptions[idx]) === JSON.stringify(subscription)) return
    db.subscriptions[idx] = subscription
  } else {
    db.subscriptions.push(subscription)
  }
  save()
}

export function removeSubscription(endpoint) {
  db.subscriptions = db.subscriptions.filter((s) => s.endpoint !== endpoint)
  db.reminders = db.reminders.filter((r) => r.endpoint !== endpoint)
  save()
}

// A reminder this far in the past when it first arrives is never sent — it was
// already missed, and firing it now would just be noise.
const STALE_MS = 10 * 60_000

/** Replaces the full reminder set for one subscription (simplest sync model — no incremental diffing). */
export function replaceReminders(endpoint, reminders) {
  // The client resends every reminder on every task change. Keep the `sent`
  // flag for ones already delivered — otherwise every edit re-fired every
  // past reminder of every not-done task.
  const previous = new Map(
    db.reminders.filter((r) => r.endpoint === endpoint).map((r) => [r.id, r]),
  )
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString()
  db.reminders = db.reminders.filter((r) => r.endpoint !== endpoint)
  for (const r of reminders) {
    const prev = previous.get(r.id)
    const sent = prev && prev.fireAt === r.fireAt ? prev.sent : r.fireAt < staleBefore
    db.reminders.push({ ...r, endpoint, sent })
  }
  save()
}

export function getDueReminders(nowIso) {
  return db.reminders.filter((r) => !r.sent && r.fireAt <= nowIso)
}

export function markSent(id, endpoint) {
  const r = db.reminders.find((x) => x.id === id && x.endpoint === endpoint)
  if (r) r.sent = true
  save()
}

export function getSubscription(endpoint) {
  return db.subscriptions.find((s) => s.endpoint === endpoint)
}

/** 'upstash' once real persistent storage is configured, 'file' otherwise. */
export function storageMode() {
  return useUpstash ? 'upstash' : 'file'
}

export function getAll() {
  return db
}

/** Sync codes are a lightweight pairing mechanism, not real accounts — whole-blob replace, no per-field merge. */
export function getSyncData(code) {
  return db.sync[code] ?? null
}

export function setSyncData(code, data) {
  // updatedAt doubles as the blob's version token for stale-upload checks, so
  // it must change on every write, even two writes in the same millisecond.
  const prev = db.sync[code]?.updatedAt
  let now = new Date()
  if (prev && now.toISOString() <= prev) now = new Date(new Date(prev).getTime() + 1)
  const updatedAt = now.toISOString()
  db.sync[code] = { ...data, updatedAt }
  save()
  return updatedAt
}
