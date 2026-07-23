import type { Task } from '../types'

const PUSH_API_URL = import.meta.env.VITE_PUSH_API_URL as string | undefined
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    Boolean(VAPID_PUBLIC_KEY) &&
    Boolean(PUSH_API_URL)
  )
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const reg = await navigator.serviceWorker.ready
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
  })

  await fetch(`${PUSH_API_URL}/api/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  })

  return subscription
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingSubscription()
  if (!subscription) return
  await fetch(`${PUSH_API_URL}/api/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {})
  await subscription.unsubscribe()
}

export interface ReminderPayload {
  id: string
  title: string
  /** ISO timestamp */
  fireAt: string
}

/** Flattens every not-done task's reminder rules into fire-at timestamps. Tasks with no time default to 09:00 on their due date. */
export function computeReminderPayloads(tasks: Task[]): ReminderPayload[] {
  const payloads: ReminderPayload[] = []
  for (const task of tasks) {
    if (task.done || !task.date || task.reminders.length === 0) continue
    const time = task.time ?? '09:00'
    const due = new Date(`${task.date}T${time}:00`)
    for (const rule of task.reminders) {
      const fireAt = new Date(due.getTime() - rule.leadMinutes * 60_000)
      payloads.push({ id: `${task.id}:${rule.leadMinutes}`, title: task.title, fireAt: fireAt.toISOString() })
    }
  }
  return payloads
}

export async function syncReminders(tasks: Task[]): Promise<void> {
  if (!PUSH_API_URL) return
  const subscription = await getExistingSubscription()
  if (!subscription) return
  await fetch(`${PUSH_API_URL}/api/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint, reminders: computeReminderPayloads(tasks) }),
  }).catch(() => {})
}
