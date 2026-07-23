import type { Task } from '../types'

/** Tasks with a manual `order` (set by drag-reordering) sort by it first; everything else keeps whatever order the caller already sorted it into (stable sort). */
export function sortByOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
}

/** Applies manual order, then stably pushes completed tasks to the end of the list — the "settles to the bottom" behavior on completion. */
export function sortForDisplay(tasks: Task[]): Task[] {
  const ordered = sortByOrder(tasks)
  const notDone = ordered.filter((t) => !t.done)
  const done = ordered.filter((t) => t.done)
  return [...notDone, ...done]
}
