# TaaDaa — Design Spec
*A Todoist-inspired task manager, scoped down and made yours*

---

## Name
**TaaDaa**

---

## Aesthetic Direction

**Overall feel:** warm minimalism. Todoist's simplicity, but softer and less corporate-SaaS. Think stationery/notebook energy, not dashboard energy.

**Color palette — "Raspberry Moon"** (exact hex values, non-negotiable):
- `#ad1357` — deep raspberry, primary accent (priority/active states, buttons)
- `#cc698f` — muted rose, secondary accent
- `#ffd4e4` — soft pink, light backgrounds/highlights
- `#b44c75` — berry, mid-tone accent
- `#c4707a` — dusty rose, sub-category tint
- `#de2776` — bright magenta, high-priority/urgent marker
- `#ffd4d4` — pale blush, hover/light states
- `#fad6d5` — cream-pink, base background tone
- Dark mode: deep plum/charcoal base (not pure black) with the same raspberry accents desaturated slightly so they don't glow harshly at night

**Typography:**
- A humanist sans for UI (Inter or similar) for legibility
- A serif for section headers or the "Today" title — gives it a personal, journal-like feel instead of app-like

**Texture over flatness:**
- Subtle paper-grain or dot-grid background texture on the calendar view (very faint, not distracting)
- Checkboxes that feel tactile — a hand-drawn-style checkmark animation on completion, not a generic Material checkmark

**Motion:**
- Completing a task: soft strikethrough + fade, maybe a tiny confetti-less "satisfying settle" animation — restrained, not gamified
- No streak counters, no karma points, no guilt-trip red badges screaming at you

---

## Dark Mode
Not just an inverted palette — should feel as intentional as the light theme:
- Base: deep plum-charcoal, not pure black — stays in the raspberry family instead of going neutral gray
- Same raspberry/magenta accents (`#ad1357`, `#de2776`), slightly desaturated so they don't glow harshly at night
- Toggle should be instant, remembered per device, and ideally auto-switch with system settings by default

---

## Aesthetic & Frictionless UX — Non-Negotiables
Since this is the whole point:
- **Minimum taps to add a task.** One input box, natural language parsing does the heavy lifting (date, project, tag all parsed from a single line — no multi-step forms or modals for basic adds)
- **No confirmation dialogs for routine actions** — completing, rescheduling, or deleting a task should be one tap/click with a quiet "undo" toast, not a "are you sure?" popup
- **Keyboard-first on desktop** — quick-add shortcut (e.g. `Q` or `Cmd+K`) so you never have to reach for the mouse
- **Consistent motion language** — same easing/timing for all transitions (opening projects, completing tasks, switching views) so it feels like one cohesive object, not stitched-together components
- **Visual hierarchy over density** — Todoist's mistake at scale is clutter; lean toward whitespace and let color/weight do the organizing instead of adding more UI chrome

---

## Sidebar
Always-visible on desktop, tucked behind a tap on mobile:
- Lists all Projects (with sub-categories nested/collapsible underneath)
- Each project shows its color dot + name; task count optional, kept subtle (small number, not a loud badge)
- A pinned "Today" and "Upcoming" shortcut at the top, above the project list
- Clicking a project filters the main view to just that project's tasks
- Tasks must be fully **editable** after creation — click any task to open it and change name, date, project, priority, reminders, tags, not just mark it done or delete it

---

## Projects → Sub-categories
One level of nesting, kept light so it doesn't turn into Notion:
- e.g. **Home** → *Groceries*, *Admin/Bills*, *Deep Clean*
- e.g. **Boyfie** → *Date Ideas*, *Gifts*, *Random*
- Sub-categories inherit the parent project's color at a lighter tint, so the calendar/list still reads as one family at a glance
- Collapsible in the sidebar — default collapsed to keep the nav short

---

## Quick-Add Toolbar (per-task controls)
Below the task-name input, a row of small icon buttons — mirrors Todoist's own quick-add bar:
- **+ (add)** — confirms/creates the task
- **# project chip** — a dropdown to pick a Project/sub-category without typing it (still works if typed manually via natural language, e.g. "call mom #home")
- **Calendar icon** — opens a date picker to set the due date, as an alternative to typing "tomorrow"/"next tues" etc.
- **Clock/alarm icon** — sets a specific time the task is due, separate from just the date
- **Flag icon** — sets priority level (of the 3 available)
- **Reminder icon** — opens reminder settings: how many reminders (1–3) and how far ahead each one fires (e.g. "1 day before," "1 hour before") — this feeds the Web Push notification system
- **Paperclip icon** — attach a note or link to the task (lightweight, no file uploads needed)
- All icons stay muted/gray until set, then light up in the raspberry accent color to show they're active — quick visual confirmation of what's been configured without opening a full modal

---

## Homepage — Next 7 Days View
The default landing view when you open TaaDaa:
- Shows everything due in the **next 7 days**, grouped by **Project** (not by date) — so you see "Home: 3 tasks," "Boyfie: 2 tasks," etc. as sections, each listing its tasks with due date/time visible
- Within each project group, sorted by due date ascending
- Overdue tasks get their own section at the top, above the 7-day grouping, so nothing slips through
- Tag-highlighted tasks (#fun, #social) still show their accent color even in this grouped view, so fun stuff doesn't get visually lost in a project list

---

## Logo
Needs a redesign — friendlier and more distinctive than a generic checkmark/list icon:
- Something small and cute that works at favicon size (16x16) and app-icon size (512x512)
- Ideas to explore: a stylized "TD" monogram in the raspberry palette, a small checkmark styled like a heart-tail or ribbon, or a tiny bow/confetti-pop motif tied to the "TaaDaa!" name (as in the exclamation of finishing something)
- Should work as a single flat shape/color for the home-screen PWA icon, not overly detailed — needs to read clearly at small sizes

---

## Workload Tracker
A quiet, ambient view of how loaded a day/week is — not a guilt metric, just situational awareness:
- Small heat-strip on the calendar (week or month view) showing task density per day — a soft gradient (light → more saturated accent) rather than numbers or bars
- Optional "capacity" view: a simple weekly summary — how many tasks completed vs pending, by project — shown only if you tap into it, not shoved in your face on open
- No streaks, no scores, no red "you're behind" banners — just enough signal to notice "Thursday's stacked" before it happens

---

## Fun/Social Tags — Calendar Highlighting Without Projects
This is a nice one — a lightweight **tag system** separate from projects, specifically for calendar highlighting:
- Type task name followed by a tag shorthand, e.g. `dinner with sara #fun` or `movie night #social` — parsed automatically, no dropdown needed
- Each tag maps to its own highlight color on the calendar (independent of project color, drawn from the Raspberry Moon palette — e.g. `#fun` → `#de2776`, `#social` → `#cc698f`) — so fun stuff visually pops out from work/errands at a glance
- Tags are freeform but a few defaults ship pre-colored (`#fun`, `#social`, `#self-care`) so you're not configuring colors before you can use it
- On the calendar, a tagged task shows as a small colored dot or soft background highlight on that day — distinct from the project-color task itself, so you can tell "this is technically a Home task but it's the fun kind" at a glance

---

## Voice / Micro-copy
Deadpan, dry, a little unbothered — never cutesy-app enthusiasm ("Yay, all done! 🎉"). The copy should sound like it has better things to do than hype you up.

- **Empty state (Today, all done):** "Nothing left. Go be hot elsewhere."
- **Empty state (no tasks yet):** "Blank canvas. Or you're procrastinating. Unclear."
- **Task completed:** no popup — just the quiet strikethrough/fade. If any toast is needed (e.g. undo), keep it one line: "Done. (undo)"
- **Overdue task:** no red guilt-banner — a small, dry label like "yesterday's problem" instead of "OVERDUE!!"
- **Empty project:** "This one's quiet. For now."
- **Sync/loading states:** short, no exclamation points — "syncing," not "Syncing your tasks! ✨"

General rule: one line max, no emoji unless it's a tag color dot, never apologize or over-explain. The app should sound confident and slightly amused, not eager to please.

---

## Scope Note — Ship Lean First
Resist building everything at once. V1 should be quick-add + calendar + tag highlighting, done beautifully — not a feature-complete app that looks average. Sub-categories and the workload tracker are genuinely nice, but they're phase 2 additions once the core loop feels great to use daily. A gorgeous 6-feature app beats a cluttered 12-feature one.

---

## Core Features (the 20% of Todoist you actually use)

1. **Quick add** — single input, natural language: "embroidery kit order thursday" → parses date, project, and #tag automatically. Toolbar of icon buttons underneath (project dropdown, date, time, priority flag, reminder, attachment) as an alternative to typing everything
2. **Today / Upcoming / Calendar views** — calendar view is the one you specifically love. Toggle between **week and month layouts** (not week-only). Date boxes should be big enough to show real content, not just a dot per task — at minimum the project name (or a short task title) visible inside each day's box, not hidden behind a tap. Workload heat-strip and tag highlights layered on top of this, not replacing the visible text
3. **Homepage = Next 7 Days view** — grouped by project, overdue section pinned at top (see above)
4. **Sidebar** — all projects/sub-categories, always visible on desktop; tasks fully editable after creation
5. **Projects with one-level sub-categories** — a handful of color-coded lists, each with light nested sub-lists (see below) — no nested sub-sub-projects
6. **Priority** — 3 levels max (not 4), shown as accent-color intensity not flags
7. **Recurring tasks** — daily/weekly/custom
8. **Subtasks** — one level deep only
9. **Reminders per task** — how many + how far ahead, feeds Web Push notifications (see below)
10. **Freeform #tags for calendar highlighting** — fun/social/self-care moments pop visually without needing their own project

**Deliberately left out:** karma/points, team sharing, filters with query syntax, integrations, labels beyond project color.

---

## Quick Add / Mobile
One app, one dataset, responsive layout — not two separate builds. Same tasks/projects sync instantly whether you open it on desktop or phone (same local storage / same backend once calendar sync is added). What changes is *layout*, not *data*:
- **Desktop:** full calendar view, sidebar with projects, more information density — closer to Todoist's desktop feel
- **Mobile:** opens straight to quick-add, full calendar/project views tucked one tap away, larger touch targets, no sidebar clutter

This needs to be near-frictionless on mobile specifically, not just "the desktop app but shrunk":
- Build as a **PWA** (Progressive Web App) from the start — installable via "Add to Home Screen" on iOS/Android, gives it a real icon and app-like launch, no App Store needed
- **Default mobile view = quick-add only**: opens straight to a single text input, natural-language parsing, hit enter, done — full calendar/project views are one tap away, not the default
- **Home screen widget** (Android) or **iOS Shortcut** — a bare input field accessible without even opening the full app, for true "add task in 3 seconds" moments
- **Share sheet support** — select text elsewhere (WhatsApp, email, notes) → Share → becomes a task, useful for things like "boyfie mentioned a restaurant, add it to date ideas"

Flag this to Claude Code as a core requirement for the frontend build (phase 1), not a later add-on — the PWA setup and mobile-first quick-add view should shape the initial architecture, not get bolted on after.

---

## The Reminder/Notification Piece — Web Push (not Google Calendar)
Real notifications, sent directly from TaaDaa itself, no Google account or Calendar API needed:
- Each task has optional reminder settings (how many, how far ahead — e.g. 1 day before + 1 hour before)
- Uses **Web Push** — once TaaDaa is installed as a PWA, it registers a service worker that can receive push messages and trigger a real system notification, even when the app isn't open
- Needs a small backend (VAPID keys + a scheduler that sends the push at the right time) — lightweight compared to OAuth, but still a real backend, not just local storage
- **iOS caveat:** only works on iOS 16.4+ and only if TaaDaa is actually installed to the home screen (not just opened in Safari) — worth a one-time reminder in the app to "Add to Home Screen" for this to work
- Flag this to Claude Code as a separate build phase from the core app, same as any backend feature

---

## Personality Touches (small, not gimmicky)
- Empty state on "Today" when everything's done: a short, dry one-liner instead of a generic "You're all caught up!" — something with a bit of your own voice
- Project color for **Boyfie** list defaults to the dusty rose accent
- Optional: date-picker easter egg where cryptic-crossword-style date shorthand works (e.g. "next Tues" parses correctly) — small QoL, fits the crossword habit
- Keep copy short and dry throughout — no exclamation-mark productivity-app enthusiasm

---

## Tech Notes for Claude Code
- Frontend: React + Tailwind, local state/local storage for MVP (no backend needed for core CRUD)
- Notifications: separate module, Web Push (VAPID keys + service worker) + a small scheduler backend (Node/Express or serverless function)
- Deploy: Vercel is the path of least resistance for both frontend + serverless push handling
- Build core app first (fully usable without notifications), Web Push as its own later phase

---

## Suggested Build Order
1. Quick add (mobile-first, PWA-ready, natural-language parsing incl. #tags) + Today/Upcoming views + projects/sub-categories + priority (core loop, usable immediately)
2. Calendar view — week AND month layouts (toggleable), date boxes sized to show project name/task detail inline, with tag highlighting + workload heat-strip
3. Recurring tasks + subtasks
4. Dark mode (system-aware, matched palette)
5. PWA polish — home screen install, widget/shortcut, share sheet
6. Visual/motion polish pass — texture, animations, empty states, keyboard shortcuts
7. Web Push notifications (VAPID + service worker + scheduler backend, separate phase)
