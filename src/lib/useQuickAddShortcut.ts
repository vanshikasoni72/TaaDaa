import { useEffect } from 'react'
import type { RefObject } from 'react'

function isTypingContext(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable
}

/** Cmd/Ctrl+K always focuses quick-add; bare "q" does too, unless already typing somewhere. */
export function useQuickAddShortcut(inputRef: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      const isBareQ =
        e.key.toLowerCase() === 'q' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTypingContext(document.activeElement)

      if (!isCmdK && !isBareQ) return

      e.preventDefault()
      const input = inputRef.current
      if (!input) return
      input.focus()
      input.select()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [inputRef])
}
