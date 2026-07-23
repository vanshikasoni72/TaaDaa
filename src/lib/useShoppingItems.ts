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
