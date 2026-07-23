import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'taadaa.dayNotes'

function loadDayNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** One freeform note per calendar day, keyed by ISO date. Deliberately separate from tasks — this is a day-level journal scrap, not a task field. */
export function useDayNotes() {
  const [notes, setNotes] = useState<Record<string, string>>(loadDayNotes)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  const setNoteForDay = useCallback((iso: string, text: string) => {
    setNotes((prev) => {
      if (!text.trim()) {
        if (!(iso in prev)) return prev
        const next = { ...prev }
        delete next[iso]
        return next
      }
      return { ...prev, [iso]: text }
    })
  }, [])

  return { notes, setNoteForDay }
}
