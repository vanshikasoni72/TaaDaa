import { useCallback, useEffect, useState } from 'react'
import type { Project } from '../types'
import { colorForNewProject } from './projectColors'

const STORAGE_KEY = 'taadaa.projects'

function buildSeedProject(name: string, subNames: string[], topLevelCount: number): Project[] {
  const parent: Project = {
    id: crypto.randomUUID(),
    name,
    color: colorForNewProject(name, topLevelCount),
    parentId: null,
    createdAt: Date.now(),
  }
  const subs: Project[] = subNames.map((subName) => ({
    id: crypto.randomUUID(),
    name: subName,
    color: parent.color,
    parentId: parent.id,
    createdAt: Date.now(),
  }))
  return [parent, ...subs]
}

// Seeding "Personal" happens INSIDE the lazy useState initializer (synchronous,
// runs once before first render) rather than in a useEffect. Doing it as an
// effect created a real race: the effect's setProjects and a fast subsequent
// resolveProjectPath call (e.g. quick-add submitted right after mount) could
// both read the same stale empty `projects` closure and each create their own
// "Personal" project, leaving two duplicates in the sidebar. Seeding
// synchronously before anything else can read `projects` avoids that entirely.
function loadProjects(): Project[] {
  let projects: Project[]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    projects = raw ? (JSON.parse(raw) as Project[]) : []
  } catch {
    projects = []
  }

  const hasPersonal = projects.some((p) => p.parentId === null && p.name.toLowerCase() === 'personal')
  if (!hasPersonal) {
    const topLevelCount = projects.filter((p) => p.parentId === null).length
    projects = [...projects, ...buildSeedProject('Personal', ['Errands', 'Shopping', 'Admin'], topLevelCount)]
  }

  return projects
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(loadProjects)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  /**
   * Resolves a raw "@Project" or "@Project/SubCategory" string into a leaf
   * project id, creating any missing parent/child along the way. One level
   * of nesting only — a third segment is ignored.
   *
   * Reads `projects` (current, already-committed state) synchronously and
   * returns the id immediately; it does NOT try to read anything back out of
   * the `setProjects` updater, since that only runs later during
   * reconciliation (see the useTasks.ts note on this).
   */
  const resolveProjectPath = useCallback(
    (raw: string): string => {
      const parts = raw
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2)

      const created: Project[] = []
      let parentId: string | null = null
      let leafId = ''

      for (const part of parts) {
        const existing =
          projects.find((p) => p.parentId === parentId && p.name.toLowerCase() === part.toLowerCase()) ??
          created.find((p) => p.parentId === parentId && p.name.toLowerCase() === part.toLowerCase())

        if (existing) {
          parentId = existing.id
          leafId = existing.id
          continue
        }

        const topLevelCount = projects.filter((p) => p.parentId === null).length + created.filter((p) => p.parentId === null).length
        const project: Project = {
          id: crypto.randomUUID(),
          name: part,
          color: colorForNewProject(part, topLevelCount),
          parentId,
          createdAt: Date.now(),
        }
        created.push(project)
        parentId = project.id
        leafId = project.id
      }

      if (created.length > 0) {
        setProjects((prev) => [...prev, ...created])
      }
      return leafId
    },
    [projects],
  )

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id && p.parentId !== id))
  }, [])

  const addProject = useCallback(
    (name: string): string => {
      const trimmed = name.trim()
      const id = crypto.randomUUID()
      if (!trimmed) return ''
      setProjects((prev) => {
        const topLevelCount = prev.filter((p) => p.parentId === null).length
        const project: Project = {
          id,
          name: trimmed,
          color: colorForNewProject(trimmed, topLevelCount),
          parentId: null,
          createdAt: Date.now(),
        }
        return [...prev, project]
      })
      return id
    },
    [],
  )

  const renameProject = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)))
  }, [])

  /** Wholesale replace, for pulling a synced snapshot from another device. */
  const replaceAllProjects = useCallback((next: Project[]) => {
    setProjects(next)
  }, [])

  return { projects, resolveProjectPath, deleteProject, addProject, renameProject, replaceAllProjects }
}
