import { addDays, fromIsoDate, toIsoDate } from './date'
import type { Recurrence } from '../types'

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tues: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thurs: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
}

const WEEKDAY_PATTERN = Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join('|')
const WEEKDAY_RE = new RegExp(`\\bevery\\s+(${WEEKDAY_PATTERN})\\b`, 'i')

export interface RecurrenceParseResult {
  recurrence: Recurrence | null
  /** set when recurrence was inferred from "every <weekday>", so a start date can be derived */
  impliedWeekday: number | null
  text: string
}

export function parseRecurrence(input: string): RecurrenceParseResult {
  let text = input

  let m = text.match(/\bevery\s+(\d+)\s+weeks?\b/i)
  if (m) {
    return {
      recurrence: { freq: 'weekly', interval: parseInt(m[1], 10) },
      impliedWeekday: null,
      text: text.replace(m[0], ''),
    }
  }

  m = text.match(/\bevery\s+(\d+)\s+days?\b/i)
  if (m) {
    return {
      recurrence: { freq: 'daily', interval: parseInt(m[1], 10) },
      impliedWeekday: null,
      text: text.replace(m[0], ''),
    }
  }

  m = text.match(WEEKDAY_RE)
  if (m) {
    return {
      recurrence: { freq: 'weekly', interval: 1 },
      impliedWeekday: WEEKDAYS[m[1].toLowerCase()],
      text: text.replace(m[0], ''),
    }
  }

  m = text.match(/\bevery\s+week\b/i)
  if (m) {
    return {
      recurrence: { freq: 'weekly', interval: 1 },
      impliedWeekday: null,
      text: text.replace(m[0], ''),
    }
  }

  m = text.match(/\bevery\s+day\b/i)
  if (m) {
    return {
      recurrence: { freq: 'daily', interval: 1 },
      impliedWeekday: null,
      text: text.replace(m[0], ''),
    }
  }

  return { recurrence: null, impliedWeekday: null, text }
}

export function nextWeekdayOnOrAfter(date: Date, weekday: number): Date {
  const diff = (weekday - date.getDay() + 7) % 7
  return addDays(date, diff)
}

export function nextOccurrence(fromIso: string, recurrence: Recurrence): string {
  const from = fromIsoDate(fromIso)
  const days = recurrence.freq === 'daily' ? recurrence.interval : recurrence.interval * 7
  return toIsoDate(addDays(from, days))
}

export function describeRecurrence(r: Recurrence): string {
  if (r.freq === 'daily') return r.interval === 1 ? 'every day' : `every ${r.interval} days`
  return r.interval === 1 ? 'every week' : `every ${r.interval} weeks`
}
