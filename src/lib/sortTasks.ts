import type { Task } from '../types'

/** The date that actually drives when a task needs doing: the work-on date if set, else the deadline. */
export function chronoDate(task: Task): string | null {
  return task.date ?? task.dueDate ?? null
}

function chronoKey(task: Task): string {
  return `${chronoDate(task) ?? ''}T${task.time ?? ''}`
}

/** Earliest doing/deadline date first. Used everywhere a list of tasks is shown — chronological order always wins over any manual drag position. */
export function sortChronological(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => chronoKey(a).localeCompare(chronoKey(b)))
}
