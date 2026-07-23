import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'data.json')

function load() {
  if (!existsSync(DB_PATH)) return { subscriptions: [], reminders: [] }
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf-8'))
  } catch {
    return { subscriptions: [], reminders: [] }
  }
}

function save(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

export function upsertSubscription(subscription) {
  const db = load()
  const idx = db.subscriptions.findIndex((s) => s.endpoint === subscription.endpoint)
  if (idx >= 0) db.subscriptions[idx] = subscription
  else db.subscriptions.push(subscription)
  save(db)
}

export function removeSubscription(endpoint) {
  const db = load()
  db.subscriptions = db.subscriptions.filter((s) => s.endpoint !== endpoint)
  db.reminders = db.reminders.filter((r) => r.endpoint !== endpoint)
  save(db)
}

/** Replaces the full reminder set for one subscription (simplest sync model — no incremental diffing). */
export function replaceReminders(endpoint, reminders) {
  const db = load()
  db.reminders = db.reminders.filter((r) => r.endpoint !== endpoint)
  for (const r of reminders) {
    db.reminders.push({ ...r, endpoint, sent: false })
  }
  save(db)
}

export function getDueReminders(nowIso) {
  const db = load()
  return db.reminders.filter((r) => !r.sent && r.fireAt <= nowIso)
}

export function markSent(id) {
  const db = load()
  const r = db.reminders.find((x) => x.id === id)
  if (r) r.sent = true
  save(db)
}

export function getSubscription(endpoint) {
  const db = load()
  return db.subscriptions.find((s) => s.endpoint === endpoint)
}

export function getAll() {
  return load()
}
