export const TAG_COLORS: Record<string, string> = {
  fun: '#de2776',
  social: '#cc698f',
  'self-care': '#b44c75',
}

export const DEFAULT_TAG_COLOR = '#9c9186'

export function colorForTag(tag: string): string {
  return TAG_COLORS[tag.toLowerCase()] ?? DEFAULT_TAG_COLOR
}
