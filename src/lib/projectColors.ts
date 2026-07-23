import type { Project } from '../types'

const ROTATION = ['#ad1357', '#cc698f', '#b44c75', '#de2776', '#c4707a']

export function colorForNewProject(name: string, existingTopLevelCount: number): string {
  if (name.trim().toLowerCase() === 'boyfie') return '#c4707a' // dusty rose, per spec
  return ROTATION[existingTopLevelCount % ROTATION.length]
}

/** Lightens a hex color toward white by `amount` (0-1). */
export function tintColor(hex: string, amount = 0.4): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Sub-categories always render as a lighter tint of their stored (parent) color. */
export function displayColorFor(project: Project): string {
  return project.parentId ? tintColor(project.color) : project.color
}
