import type { Project, Task } from '../types'

interface ImportPayload {
  tasks: Task[]
  projects: Project[]
  dayNotes?: Record<string, string>
}

function isImportPayload(data: unknown): data is ImportPayload {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return Array.isArray(d.tasks) && Array.isArray(d.projects)
}

/** Reads and validates a file produced by exportData() — throws a plain Error whose message is safe to show the user directly if the file isn't a recognizable TaaDaa export. */
export async function parseImportFile(file: File): Promise<ImportPayload> {
  const text = await file.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (!isImportPayload(data)) {
    throw new Error("That doesn't look like a TaaDaa export — expected tasks and projects arrays.")
  }
  return data
}

/**
 * Wholesale replace, same "simplest thing that works" philosophy as cross-
 * device sync's join flow — writes straight to localStorage and reloads,
 * rather than threading dayNotes/shoppingItems replace callbacks through
 * props just for this one rare, deliberate action.
 */
export function applyImport(data: ImportPayload) {
  localStorage.setItem('taadaa.tasks', JSON.stringify(data.tasks))
  localStorage.setItem('taadaa.projects', JSON.stringify(data.projects))
  if (data.dayNotes) localStorage.setItem('taadaa.dayNotes', JSON.stringify(data.dayNotes))
  window.location.reload()
}
