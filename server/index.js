import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import webpush from 'web-push'
import cron from 'node-cron'
import {
  upsertSubscription,
  removeSubscription,
  replaceReminders,
  getDueReminders,
  markSent,
  getSubscription,
  getSyncData,
  setSyncData,
} from './db.js'

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PORT = 4000 } = process.env

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in server/.env — generate with `npx web-push generate-vapid-keys`.')
  process.exit(1)
}

webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:example@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/subscribe', (req, res) => {
  const subscription = req.body
  if (!subscription?.endpoint) return res.status(400).json({ error: 'invalid subscription' })
  upsertSubscription(subscription)
  res.json({ ok: true })
})

app.post('/api/unsubscribe', (req, res) => {
  const { endpoint } = req.body
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' })
  removeSubscription(endpoint)
  res.json({ ok: true })
})

// Replaces the full reminder set for one subscription. Body:
// { endpoint, reminders: [{ id, title, fireAt (ISO string) }] }
app.post('/api/reminders', (req, res) => {
  const { endpoint, reminders } = req.body
  if (!endpoint || !Array.isArray(reminders)) {
    return res.status(400).json({ error: 'endpoint and reminders[] required' })
  }
  replaceReminders(endpoint, reminders)
  res.json({ ok: true, count: reminders.length })
})

function isValidSyncCode(code) {
  return typeof code === 'string' && /^[A-Za-z0-9]{4,32}$/.test(code)
}

// Lightweight cross-device sync: a code is just a shared key for one JSON
// blob, not a real account. Whoever has the code can read/overwrite it —
// fine for a personal task app, not meant to hold anything sensitive.
app.get('/api/sync/:code', (req, res) => {
  if (!isValidSyncCode(req.params.code)) return res.status(400).json({ error: 'invalid code' })
  const data = getSyncData(req.params.code)
  if (!data) return res.status(404).json({ error: 'not found' })
  res.json(data)
})

app.post('/api/sync/:code', (req, res) => {
  if (!isValidSyncCode(req.params.code)) return res.status(400).json({ error: 'invalid code' })
  const { tasks, projects } = req.body
  if (!Array.isArray(tasks) || !Array.isArray(projects)) {
    return res.status(400).json({ error: 'tasks[] and projects[] required' })
  }
  setSyncData(req.params.code, { tasks, projects })
  res.json({ ok: true })
})

// Sends a push immediately, bypassing the schedule — handy for testing and for
// a manual "send a test notification" button in the app.
app.post('/api/test-push', async (req, res) => {
  const { endpoint, title, body } = req.body
  const subscription = getSubscription(endpoint)
  if (!subscription) return res.status(404).json({ error: 'subscription not found' })
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title: title || 'TaaDaa', body: body || '' }))
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

async function sendDueReminders() {
  const due = getDueReminders(new Date().toISOString())
  for (const reminder of due) {
    const subscription = getSubscription(reminder.endpoint)
    if (!subscription) {
      // no subscription to deliver to at all — nothing to retry, drop it
      markSent(reminder.id)
      continue
    }
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title: 'TaaDaa', body: reminder.title }),
      )
      markSent(reminder.id)
    } catch (err) {
      // 410 Gone / 404 means the browser unsubscribed or the subscription expired —
      // drop both the subscription and this reminder, retrying won't help.
      if (err.statusCode === 410 || err.statusCode === 404) {
        removeSubscription(reminder.endpoint)
        markSent(reminder.id)
      } else {
        // Anything else (transient network blip, momentary FCM hiccup) is left
        // unsent on purpose so the next minute's cron tick retries it.
        console.error('push send failed, will retry next tick', {
          statusCode: err.statusCode,
          body: err.body,
          message: err.message,
        })
      }
    }
  }
}

cron.schedule('* * * * *', sendDueReminders)

app.listen(PORT, () => {
  console.log(`TaaDaa push server listening on http://localhost:${PORT}`)
})
