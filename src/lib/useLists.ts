import { useCallback, useEffect, useState } from 'react'
import type { TaskList } from '../types'

const STORAGE_KEY = 'taadaa.lists'
const OLD_SHOPPING_KEY = 'taadaa.shoppingItems'

interface OldShoppingItem {
  id: string
  text: string
  checked: boolean
  createdAt: number
}

/**
 * One-time migration from the old single-list "shopping items" store into a
 * "Shopping" entry in the new multi-list store — so nobody's existing list
 * silently disappears when this feature generalized. Only creates the
 * "Shopping" list if there was actually something in it; the old key is
 * removed afterward so this only ever runs once.
 */
function migrateOldShoppingList(): TaskList[] | null {
  try {
    const raw = localStorage.getItem(OLD_SHOPPING_KEY)
    if (!raw) return null
    const oldItems = JSON.parse(raw) as OldShoppingItem[]
    localStorage.removeItem(OLD_SHOPPING_KEY)
    if (!Array.isArray(oldItems) || oldItems.length === 0) return null
    return [{ id: crypto.randomUUID(), name: 'Shopping', items: oldItems, createdAt: Date.now() }]
  } catch {
    return null
  }
}

function loadLists(): TaskList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as TaskList[]
    return migrateOldShoppingList() ?? []
  } catch {
    return []
  }
}

/** Fully independent of the tasks/projects data model — its own localStorage key, never touches useTasks or useProjects. */
export function useLists() {
  const [lists, setLists] = useState<TaskList[]>(loadLists)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
  }, [lists])

  // Same fix as useTasks/useProjects/useShoppingItems: adopt a newer value
  // written by another tab/window on this device instead of letting this
  // tab's next edit silently overwrite it with a stale in-memory copy.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      try {
        setLists(e.newValue ? (JSON.parse(e.newValue) as TaskList[]) : [])
      } catch {
        // ignore a malformed write from another tab
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const addList = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const id = crypto.randomUUID()
    setLists((prev) => [...prev, { id, name: trimmed, items: [], createdAt: Date.now() }])
    return id
  }, [])

  const renameList = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: trimmed } : l)))
  }, [])

  const deleteList = useCallback((id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const addItem = useCallback((listId: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: [...l.items, { id: crypto.randomUUID(), text: trimmed, checked: false, createdAt: Date.now() }] }
          : l,
      ),
    )
  }, [])

  const toggleItem = useCallback((listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)) }
          : l,
      ),
    )
  }, [])

  const clearChecked = useCallback((listId: string) => {
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, items: l.items.filter((i) => !i.checked) } : l)),
    )
  }, [])

  const replaceAllLists = useCallback((next: TaskList[]) => {
    setLists(next)
  }, [])

  return { lists, addList, renameList, deleteList, addItem, toggleItem, clearChecked, replaceAllLists }
}
