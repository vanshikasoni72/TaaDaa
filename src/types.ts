export interface Recurrence {
  freq: 'daily' | 'weekly'
  /** repeat every N days (daily) or N weeks (weekly) */
  interval: number
}

export interface ReminderRule {
  /** minutes before the task's due date/time this reminder fires */
  leadMinutes: number
}

export type Priority = 1 | 2 | 3

export interface Project {
  id: string
  name: string
  /** hex color; sub-categories inherit the parent's color at a lighter tint in the UI, not stored separately */
  color: string
  /** One level deep only: a sub-category's own parentId is never itself set to another sub-category. */
  parentId: string | null
  createdAt: number
}

export interface Task {
  id: string
  title: string
  done: boolean
  /** "Work on" date — ISO YYYY-MM-DD, or null if unscheduled. Drives calendar placement. */
  date: string | null
  /** "HH:MM" 24h, or null if only a date (no specific time) was set */
  time: string | null
  /** Actual deadline — ISO YYYY-MM-DD, or null if none. The harder constraint: drives "yesterday's problem" (overdue) instead of `date`. */
  dueDate: string | null
  projectId: string | null
  priority: Priority | null
  tags: string[]
  /** 0-3 entries; each fires that many minutes before the task's date/time (or 09:00 on that date if no time is set) */
  reminders: ReminderRule[]
  /** lightweight freeform note or link, no file uploads */
  note: string | null
  recurrence: Recurrence | null
  /** One level deep only: a subtask's own parentId is never itself set to another subtask. */
  parentId: string | null
  createdAt: number
  /** Manual position within whichever list it was last drag-reordered in; null until touched, falls back to that list's default sort. */
  order: number | null
}
