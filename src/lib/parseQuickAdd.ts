import * as chrono from 'chrono-node'
import { formatTime, toIsoDate, todayIso } from './date'
import { nextWeekdayOnOrAfter, parseRecurrence } from './recurrence'
import type { Priority, Recurrence, ReminderRule } from '../types'

export interface ParsedQuickAdd {
  title: string
  date: string | null
  /** the deadline, parsed from a "due <date>" / "due on <date>" / "due by <date>" phrase */
  dueDate: string | null
  /** "HH:MM", parsed from a phrase like "at 5pm" — pairs with `date`, same as the manual time field */
  time: string | null
  /** 1/2/3, parsed from a standalone "!"/"!!"/"!!!" token — see PRIORITY_RE */
  priority: Priority | null
  /** raw "@Project" or "@Project/SubCategory" text, not yet resolved to a project id */
  projectPath: string | null
  tags: string[]
  recurrence: Recurrence | null
}

/** Everything QuickAdd's toolbar can layer on top of the parsed text. */
export interface QuickAddSubmission extends ParsedQuickAdd {
  /** set via the project dropdown; takes precedence over `projectPath` when resolving */
  projectId: string | null
  reminders: ReminderRule[]
  note: string | null
}

const TAG_RE = /#([a-z0-9][a-z0-9-]*)/gi
const PROJECT_RE = /@([a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)?)/gi

// A standalone run of "!" sets priority 1/2/3, clamped at 3 for anything
// longer — more bangs, higher priority, same direction as the priority scale
// elsewhere (level 3 is the most intense accent). "Standalone" (bounded by
// whitespace/start/end, not glued to a word) is deliberate — it's what keeps
// this from firing on an ordinary exclamatory title like "we won!", where the
// "!" sits directly against the last word instead of as its own token.
const PRIORITY_RE = /(^|\s)(!+)(?=\s|$)/

// "due on"/"due by"/bare "due" all work the same way — the "on"/"by" is
// optional. Bare "due" alone used to be excluded entirely (too likely to show
// up in ordinary titles like "pay the fee due to a card issue"), but the
// safety net below already covers that: this regex only marks *where* a due
// date might start, it doesn't commit to one — chrono still has to find an
// actual parseable date right after it (`dueResults.length > 0`), or nothing
// happens and the text is left untouched. "due to a card issue" never finds
// a date after "due ", so it still falls through safely.
const DUE_MARKER_RE = /\bdue\s+(?:(?:on|by)\s+)?/i

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

  let priority: Priority | null = null
  text = text.replace(PRIORITY_RE, (_match, lead: string, bangs: string) => {
    priority = Math.min(bangs.length, 3) as Priority
    return lead
  })

  const { recurrence, impliedWeekday, text: textAfterRecurrence } = parseRecurrence(text)
  text = textAfterRecurrence

  let dueDate: string | null = null
  const dueMarker = DUE_MARKER_RE.exec(text)
  if (dueMarker) {
    const afterMarker = text.slice(dueMarker.index + dueMarker[0].length)
    const dueResults = chrono
      .parse(maskAmbiguousTimeWords(afterMarker), new Date(), { forwardDate: true })
      .filter(hasDateComponent)
    if (dueResults.length > 0) {
      const result = dueResults[0]
      dueDate = toIsoDate(result.start.date())
      const matchStart = dueMarker.index
      const matchEnd = dueMarker.index + dueMarker[0].length + result.index + result.text.length
      text = text.slice(0, matchStart) + text.slice(matchEnd)
    }
  }

  let date: string | null = null
  let time: string | null = null
  const results = chrono
    .parse(maskAmbiguousTimeWords(text), new Date(), { forwardDate: true })
    .filter(hasDateComponent)
  if (results.length > 0) {
    const result = results[0]
    date = toIsoDate(result.start.date())
    if (result.start.isCertain('hour')) time = formatTime(result.start.date())
    text = text.slice(0, result.index) + text.slice(result.index + result.text.length)
  } else if (recurrence) {
    date = impliedWeekday !== null ? toIsoDate(nextWeekdayOnOrAfter(new Date(), impliedWeekday)) : todayIso()
  }

  // A combined phrase like "tomorrow at 5pm" already got its time above, as
  // part of the same chrono match as the date. A bare time with no date
  // ("call mom at 5pm") never passes hasDateComponent, so it's never in
  // `results` above — try again here, unfiltered, for a certain hour only.
  if (time === null) {
    const timeResults = chrono.parse(maskAmbiguousTimeWords(text), new Date(), { forwardDate: true })
    const timeResult = timeResults.find((r) => r.start.isCertain('hour'))
    if (timeResult) {
      time = formatTime(timeResult.start.date())
      text = text.slice(0, timeResult.index) + text.slice(timeResult.index + timeResult.text.length)
    }
  }

  const title = text.replace(/\s+/g, ' ').trim()

  return { title, date, dueDate, time, priority, projectPath, tags, recurrence }
}
