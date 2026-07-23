import type { Project, Task } from '../types'

export function exportData(tasks: Task[], projects: Project[]) {
  let dayNotes: Record<string, string> = {}
  try {
    dayNotes = JSON.parse(localStorage.getItem('taadaa.dayNotes') || '{}')
  } catch {
    dayNotes = {}
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    tasks,
    projects,
    dayNotes,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `taadaa-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
