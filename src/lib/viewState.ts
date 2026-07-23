export type ViewState =
  | { kind: 'home' }
  | { kind: 'today' }
  | { kind: 'upcoming' }
  | { kind: 'calendar' }
  | { kind: 'project'; projectId: string }
