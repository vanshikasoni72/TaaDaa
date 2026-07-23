/**
 * Reads a share coming in via the Web Share Target manifest entry
 * (Android/Chrome "Share to TaaDaa" from other apps). Consumes the URL —
 * call once on mount, not on every render.
 */
export function readSharedText(): string | null {
  if (window.location.pathname !== '/share-target') return null

  const params = new URLSearchParams(window.location.search)
  const text = params.get('text') || params.get('title') || params.get('url')

  window.history.replaceState({}, '', '/')

  return text?.trim() || null
}
