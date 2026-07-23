import * as chrono from 'chrono-node'
import { toIsoDate, todayIso } from './date'
import { nextWeekdayOnOrAfter, parseRecurrence } from './recurrence'
import type { Priority, Recurrence, ReminderRule } from '../types'

export interface ParsedQuickAdd {
  title: string
  date: string | null
  /** raw "@Project" or "@Project/SubCategory" text, not yet resolved to a project id */
  projectPath: string | null
  tags: string[]
  recurrence: Recurrence | null
}

/** Everything QuickAdd's toolbar can layer on top of the parsed text. */
export interface QuickAddSubmission extends ParsedQuickAdd {
  time: string | null
  /** the actual deadline, purely manual — text parsing never sets this, only "date" (work-on) */
  dueDate: string | null
  /** set via the project dropdown; takes precedence over `projectPath` when resolving */
  projectId: string | null
  priority: Priority | null
  reminders: ReminderRule[]
  note: string | null
}

const TAG_RE = /#([a-z0-9][a-z0-9-]*)/gi
const PROJECT_RE = /@([a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)?)/gi

// chrono treats bare time-of-day words as anchors and can swallow an adjacent
// relative phrase into a bogus match (e.g. "game night in 3 days" resolves to
// "today", not +3 days). We never store time-of-day, only the date, so it's
// safe to blank these out before parsing — same length, so match indices
// into the original string stay valid.
const AMBIGUOUS_TIME_WORDS = /\b(night|morning|afternoon|evening|noon|midnight)\b/gi

function maskAmbiguousTimeWords(text: string): string {
  return text.replace(AMBIGUOUS_TIME_WORDS, (m) => ' '.repeat(m.length))
}

function hasDateComponent(result: chrono.ParsedResult): boolean {
  const start = result.start
  return (
    start.isCertain('day') ||
    start.isCertain('month') ||
    start.isCertain('year') ||
    start.isCertain('weekday')
  )
}

export function parseQuickAdd(input: string): ParsedQuickAdd {
  let text = input

  const tags: string[] = []
  text = text.replace(TAG_RE, (_match, tag: string) => {
    tags.push(tag.toLowerCase())
    return ''
  })

  let projectPath: string | null = null
  text = text.replace(PROJECT_RE, (_match, name: string) => {
    if (!projectPath) projectPath = name
    return ''
  })

  const { recurrence, impliedWeekday, text: textAfterRecurrence } = parseRecurrence(text)
  text = textAfterRecurrence

  let date: string | null = null
  const results = chrono
    .parse(maskAmbiguousTimeWords(text), new Date(), { forwardDate: true })
    .filter(hasDateComponent)
  if (results.length > 0) {
    const result = results[0]
    date = toIsoDate(result.start.date())
    text = text.slice(0, result.index) + text.slice(result.index + result.text.length)
  } else if (recurrence) {
    date = impliedWeekday !== null ? toIsoDate(nextWeekdayOnOrAfter(new Date(), impliedWeekday)) : todayIso()
  }

  const title = text.replace(/\s+/g, ' ').trim()

  return { title, date, projectPath, tags, recurrence }
}
