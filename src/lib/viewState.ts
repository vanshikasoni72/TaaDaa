export type ViewState =
  | { kind: 'inbox' }
  | { kind: 'today' }
  | { kind: 'upcoming' }
  | { kind: 'calendar' }
  | { kind: 'completed' }
  | { kind: 'project'; projectId: string }
