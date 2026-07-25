import { useCallback, useEffect, useState } from 'react'

export interface ShoppingItem {
  id: string
  text: string
  checked: boolean
  createdAt: number
}

const STORAGE_KEY = 'taadaa.shoppingItems'

function loadItems(): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ShoppingItem[]) : []
  } catch {
    return []
  }
}

/** Fully independent of the tasks/projects data model — its own localStorage key, never touches useTasks or useProjects. */
export function useShoppingItems() {
  const [items, setItems] = useState<ShoppingItem[]>(loadItems)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // See the matching listener in useTasks.ts — adopts a newer value written
  // by another tab/window on this device instead of letting this tab's next
  // edit silently overwrite it with a stale in-memory copy. This is the fix
  // for the shopping list "not even staying on the same device" — it's
  // remounted fresh each time the drawer opens, so a stale background tab
  // (or the PWA left open alongside a browser tab) was the likely culprit.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      try {
        setItems(e.newValue ? (JSON.parse(e.newValue) as ShoppingItem[]) : [])
      } catch {
        // ignore a malformed write from another tab
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const addItem = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setItems((prev) => [...prev, { id: crypto.randomUUID(), text: trimmed, checked: false, createdAt: Date.now() }])
  }, [])

  const toggleItem = useCallback((id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)))
  }, [])

  const clearChecked = useCallback(() => {
    setItems((prev) => prev.filter((i) => !i.checked))
  }, [])

  return { items, addItem, toggleItem, clearChecked }
}
