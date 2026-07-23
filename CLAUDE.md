# TaaDaa

A Todoist-inspired task manager, scoped down and made personal. Full design intent lives in `task-app-spec.md` — this file is the condensed, working-reference version for day-to-day building.

**Status: complete v1.** All 7 phases from the build order are done (see Scope Rules below) — quick-add, projects/sidebar, calendar, recurring tasks/subtasks, dark mode, PWA install/share-sheet, and Web Push notifications are all built and verified. Treat future work as **refinements and bug fixes to an already-shipped app**, not new feature builds — don't introduce new views, new data-model fields, or new architecture unless the user explicitly asks for a new feature. When in doubt, prefer the smallest change that fixes the actual problem.

## Stack
- React + TypeScript + Vite (frontend), standalone Node/Express (`server/`) for push notifications — two separate deployables, see Push Notifications below.
- Tailwind CSS v4 (CSS-first config via `@theme` in `src/index.css` — no `tailwind.config.js`)
- `vite-plugin-pwa` with the **`injectManifest`** strategy (not `generateSW`) — needed because the service worker (`src/sw.ts`) has custom `push`/`notificationclick` handlers, which `generateSW`'s auto-generated Workbox SW can't express. `workbox-precaching` is a direct dependency because `src/sw.ts` calls `precacheAndRoute` itself.
- `chrono-node` for natural-language date parsing
- `sharp` (devDependency) rasterizes `public/icon*.svg` into the PNG sizes each platform needs — rerun `node scripts/generate-icons.mjs` after changing the logo, don't hand-export PNGs
- Local storage for persistence (no database — tasks/projects never leave the browser; only *reminder schedules* get synced to the push backend, see below)
- Fonts self-hosted via `@fontsource/*` (offline-safe for a PWA — never load fonts from a CDN link)

## Palette — "Raspberry Moon" (defined in `src/index.css` `@theme`)
Exact hex values are spec'd, not arbitrary — don't "improve" them without checking the spec first.
- `cream` `#FAD6D5` — base background (light, cream-*pink*, not the old neutral cream). `cream-dark` `#241019`, a deep plum-charcoal, for dark mode.
- `ink` `#2B2A28` / `ink-dark` `#F2EDE6` — text, unchanged from before; the spec only redefined accents, not text color.
- `raspberry` `#AD1357` — the one confident primary accent: active states, buttons, priority.
- `rose` `#CC698F` — secondary accent; also the "done/calm" completed-checkbox color (there's no green in this palette, so rose took over the role `sage` used to play in the old palette).
- `softpink` `#FFD4E4`, `berry` `#B44C75`, `dustyrose` `#C4707A`, `magenta` `#DE2776`, `blush` `#FFD4D4` — supporting roles: `berry` colors the `#self-care` tag, `magenta` colors `#fun` and top-of-scale priority, `dustyrose` is the Boyfie project's default and general sub-category tint, `softpink`/`blush` are light-surface/hover tones.
- All accent tokens get desaturated/lightened overrides inside a `.dark { ... }` block in `index.css` (plain CSS custom-property overrides — every `bg-raspberry`/`text-rose`/etc. usage picks these up automatically in dark mode, no component changes needed).
- Priority tint scale (`priorityColor()` in `TaskItem.tsx`): level 1 → rose, level 2 → raspberry, level 3 → magenta — increasing intensity of one accent family, not four unrelated colors.

## Dark Mode
Manual toggle (`auto` / `light` / `dark`, `src/components/ThemeToggle.tsx`), defaulting to `auto` (system preference) until the user picks otherwise. Choice persists per device in `localStorage['taadaa.theme']`.
- **Class-based, not media-query-based:** `index.css` uses `@custom-variant dark (&:where(.dark, .dark *));` so every `dark:` utility responds to a `.dark` class on `<html>`, not directly to `prefers-color-scheme`. `src/lib/useTheme.ts` keeps that class in sync — applying the stored pref on mount, and (only when pref is `auto`) listening for OS-level scheme changes live.
- A blocking inline script in `index.html` `<head>` sets the class before first paint, to avoid a flash of the wrong theme — keep it in sync with `src/lib/theme.ts` if the storage key or logic changes.
- `theme-color` meta tag is updated at runtime too (`applyThemeClass` in `theme.ts`, values `#FAD6D5` / `#241019`) so mobile browser chrome matches.

## Typography
- Sans (Inter) for UI/body text — legibility.
- Serif (Fraunces, italic) for section headers and view titles ("Home", "Today", project names) — journal/stationery feel, not app-dashboard feel. Never use the serif for body copy or buttons.

## Voice / Micro-copy
Deadpan, dry, unbothered. Never cutesy or exclamation-heavy.
- All done: "Nothing left. Go be hot elsewhere."
- No tasks yet: "Blank canvas. Or you're procrastinating. Unclear."
- Overdue section label: "yesterday's problem" (not "OVERDUE!!")
- Empty project/day: "This one's quiet. For now."
- Completed task: quiet strikethrough + fade, undo toast reads "Done. (undo)" — no confetti, no streaks.
- Loading state: "syncing," lowercase, no exclamation point or emoji.
- Small functional glyphs (priority flag, reminder bell, note paperclip, recurrence ↻) are plain SVG/Unicode, not colorful emoji — matches the hand-drawn-checkmark, non-gamified visual language. The "no emoji" voice rule is about copy, not these icons, but the effect should look the same: restrained.

## Data Model (`src/types.ts`)
- `Project { id, name, color, parentId, createdAt }` — one level of nesting (`parentId` on a sub-category points at a top-level project; a sub-category's own `parentId` is never itself set to another sub-category). Colors: `colorForNewProject()` in `src/lib/projectColors.ts` special-cases "Boyfie" → dusty rose (per spec), otherwise rotates through the accent palette; sub-categories store their *parent's* color and get tinted lighter at render time via `displayColorFor()` — never store a separately-tinted color, always derive it, so re-tinting logic lives in one place.
- `Task` gained `time` (optional "HH:MM", independent of `date`), `projectId` (replaces the old flat `project: string`), `priority` (`1 | 2 | 3 | null`), `reminders` (`ReminderRule[]`, 0-3 entries, each `{ leadMinutes }`), and `note` (freeform text/link, no file uploads) on top of the existing fields.
- **`useProjects.ts`'s `resolveProjectPath()`** turns a raw `"@Home/Groceries"` string into a leaf project id, auto-creating the parent and/or sub-category if they don't exist yet — same "frictionless, no dropdown required" philosophy as tags. One level deep only (a third `/segment` is silently ignored). Reads current `projects` state synchronously and returns the id immediately rather than trying to read anything back out of `setProjects`'s updater — see the React gotcha note under Undo Toast; the same rule applies here.

## Navigation & Views
Sidebar-driven, not tab-driven — `src/lib/viewState.ts` defines `ViewState` (`home | today | upcoming | calendar | { project: id }`), owned by `App.tsx`, rendered by `src/components/Sidebar.tsx`.
- **Desktop:** sidebar is a fixed always-visible column (`hidden sm:block`). **Mobile:** hidden behind a hamburger button (`☰`, top-left) that opens a slide-in drawer with a dimmed backdrop — same `Sidebar` component in both places, just two different wrapping containers in `App.tsx`.
- Sidebar has pinned links (Home/Today/Upcoming/Calendar) above a collapsible Projects list (color dot + name + subtle pending-count, sub-categories nested and collapsed by default), and a notification toggle pinned to the bottom (`mt-auto`).
- **Home** (`HomeView.tsx`) is the default landing view: next-7-days tasks grouped by project (sub-category groups are labeled `"Parent / Sub"`, not just `"Sub"`, so the hierarchy stays legible outside the sidebar's nesting), with an overdue section pinned above the groups — this is "Homepage" from the spec, distinct from the **Today** view (`TodayView.tsx`, unchanged from earlier phases: overdue/today/upcoming/whenever bucketed by date, not project).
- **Upcoming** (`UpcomingView.tsx`) is a flat chronological list of everything dated after today — deliberately simple, no grouping.
- **Project view** (`ProjectView.tsx`) shows a flat list of one project's own tasks (exact `projectId` match only — selecting a parent project does *not* also pull in its sub-categories' tasks; drill into the sub-category itself via the sidebar for that).
- All list/group views funnel through the same `TaskItem` component, so completion/delete/subtask/edit behavior never diverges by view.

## Task Editing
Click any task's title/body (not the checkbox or delete ✕) to open `TaskEditModal.tsx` — a bottom sheet on mobile, centered dialog on desktop. Every field **auto-saves on change** (no Save/Cancel buttons) via `updateTask(id, changes)` in `useTasks.ts` — consistent with the app's "no confirmation dialogs for routine actions" stance; closing the modal is just dismissal, not a commit step. Delete is available inline at the bottom.

## Quick-Add Toolbar
`QuickAdd.tsx` still parses free text first (date/`@project`/`#tag`/recurrence via `parseQuickAdd`), but now has an icon row underneath (folder/calendar/clock/flag/bell/paperclip, from `src/components/icons.tsx`) that layers manual overrides on top — clicking an icon opens one inline panel below the row (only one at a time; simpler and more robust than floating popovers, especially on mobile) for project/date/time/priority/reminders/note. Icons go from muted to raspberry-filled once a value is set, mirroring the spec's "icons light up in the accent color" requirement.
- At submit, `App.tsx`'s `handleAdd` merges: manual date wins over parsed date; manual project id wins over the parsed `@project` text (which still gets resolved via `resolveProjectPath` if no manual override was picked); everything else (priority/time/reminders/note) is purely manual since text parsing never sets those.
- The subtask "+ subtask" inline input (in `TaskItem.tsx`) has **no** toolbar — it still only runs through `parseQuickAdd`, so date/`@project`/`#tag` work there but priority/reminders/note don't. Deliberately kept minimal; add the toolbar there too if subtasks turn out to need it in practice.

## Quick-Add Syntax
Parsed from a single free-text input (`src/lib/parseQuickAdd.ts`):
- Natural-language dates via chrono-node ("tomorrow", "next tuesday", "in 3 days", etc.)
- `@ProjectName` or `@ProjectName/SubCategory` — resolved to a project id at add-time via `resolveProjectPath` (see Data Model above), not inside the parser itself, since the parser has no access to the current projects list.
- `#tag` — freeform calendar-highlight tag, independent of project. Defaults ship pre-colored: `#fun` → magenta, `#social` → rose, `#self-care` → berry (see `src/lib/tags.ts`). Unknown tags fall back to a muted neutral dot color — always give new tags *some* color rather than none.
- Whatever text remains after stripping the above becomes the task title.
- **chrono-node gotcha:** bare time-of-day words ("night", "morning", "evening", "afternoon", "noon", "midnight") get masked out before parsing (`maskAmbiguousTimeWords` in `parseQuickAdd.ts`). Without this, chrono anchors on the word alone and silently swallows an adjacent relative phrase — e.g. "game night in 3 days" was resolving to *today*, not +3 days, and mangling the title down to "game". Safe to mask because the app never stores time-of-day *in the date parser* (the toolbar's separate time field is unaffected). Compound words like "tonight" are unaffected (word-boundary regex). Keep the `hasDateComponent` filter (uses chrono's `isCertain()`) if you touch this file — it rejects matches chrono only guessed rather than actually parsed.
- **Recurrence phrases** ("every day", "every week", "every N days/weeks", "every monday") are parsed by `src/lib/recurrence.ts` *before* chrono ever sees the text. **Deliberately no bare "daily"/"weekly" adjective support** — only full "every X" phrasing triggers recurrence, because bare `/\bdaily\b/` used to also match inside ordinary titles like "daily standup", silently corrupting them. Don't re-add bare adjective matching without solving that ambiguity first.

## Recurring Tasks
`src/lib/recurrence.ts` — model is intentionally minimal: `{ freq: 'daily' | 'weekly', interval: number }`, no day-of-month or multi-weekday rules.
- Completing a recurring task (`toggleTask` in `useTasks.ts`) marks that instance done *and* spawns a fresh not-done instance dated `nextOccurrence()` away — same title/project/tags/recurrence, new id. History is preserved (you can see past completions), unlike editing the date in place.
- Un-completing (toggling back) does **not** retract the spawned next instance — there's no linkage tracked between occurrences. Deliberately skipped for V1 simplicity; the undo *toast* (not manual re-toggle) does retract it, since it precomputes the spawned id up front.
- Displayed as a small "↻ every day" style chip in `TaskRow` (inside `TaskItem.tsx`) and in the quick-add preview.

## Subtasks
One level deep only, enforced by convention rather than the type system: `Task.parentId` points at a parent, and a subtask's own `parentId` is never itself set to another subtask.
- Bucketing/grouping logic everywhere (`HomeView`, `TodayView`, `UpcomingView`, `ProjectView`, `CalendarView`) filters to `parentId === null` for top-level placement — a subtask's own `date` is cosmetic only right now, it never causes the subtask to appear in its own bucket/group. It's always rendered nested under its parent, wherever the parent lands.
- Add via the "+ subtask" affordance under each top-level `TaskItem`.
- Deleting a parent (`deleteTask` in `useTasks.ts`) cascades to delete its subtasks too.

## Calendar View
`src/components/CalendarView.tsx` — toggles between **week** (Monday–Sunday) and **month** grid layouts. Both layouts share the same `DayCell` rendering so the visual language never diverges.
- Day cells are big enough to show content directly, not just a tap target: each shows the day number (today gets a filled raspberry circle) plus up to `maxTitles` task titles inline (prefixed with `@Project` if the task has one, and a tag-color dot if it has tags), truncated, with a "+N more" line if there are more. Week cells fit 4 titles, month cells fit 2 — deliberately fewer in month layout since there are up to 6 rows competing for vertical space. Not-done tasks are sorted to the front of that list.
- The **heat-strip** is the day cell's own background tint — `heatClass()` washes the whole cell in raspberry at increasing opacity by task count (0/1–2/3–4/5+ tiers, never a number). A selected day overrides this with a stronger raspberry wash + ring instead of blending the two.
- Tapping a day selects it and shows that day's tasks below the grid — fully interactive there (checkboxes, delete, subtasks, click-to-edit), unlike the read-only inline preview in the cell itself. Empty day copy: "This one's quiet. For now."
- Month grid pads with adjacent-month days (muted, still clickable) so every row is a full week — `getMonthGridDays()` in `lib/date.ts`.
- The faint dot-grid texture (`.calendar-texture` in `index.css`) is scoped to this view only.
- Undated tasks never appear here by design — the calendar is strictly date-driven.

## Motion & Micro-interactions
Three duration tiers, used consistently rather than ad-hoc per component:
- **150ms** (`duration-150`) — hover/focus micro-feedback.
- **300ms** (`duration-300`) — discrete state changes: nav/tab/theme selection, calendar day-cell selection, the checkbox's border/fill/checkmark-draw, toast enter/exit.
- **500ms** (`duration-500`) — deliberate emphasis: the task-completion opacity+strikethrough fade. The one place slower is intentional.
- `check-pop` (checkbox) and `toast-in` (`Toast`) are hand-written `@keyframes` in `index.css` using a springy overshoot easing — deliberate exceptions for tactile feel. Don't add more custom keyframes casually.
- Dark mode itself stays **instant**, no transition.
- The checkbox's checkmark path (`Checkbox.tsx`) uses quadratic Bézier segments plus a tiny curl past the tip, to read as hand-drawn rather than geometric.

## Undo Toast
`src/components/Toast.tsx` + state in `App.tsx`. Fires for completing a task (not un-completing) and for deleting a task. Single-slot, auto-dismisses after 4.5s. Copy is exactly "Done." / "Deleted." plus a separate "(undo)".
- **React gotcha, read before touching `useTasks.ts` or `useProjects.ts`:** `setState(prev => ...)` does **not** invoke the updater synchronously — React only *queues* it; the updater actually runs later, during reconciliation. Anything the caller needs to know *right now* (did this complete the task? what id did we just create?) must be decided by reading the already-current state array **before** calling the mutator, not by trying to extract a result from inside the updater afterward. This bit us once already (`toggleTask`/`deleteTask`'s undo-toast plumbing) and the same pattern is used correctly in `resolveProjectPath`.

## Keyboard Shortcuts
`src/lib/useQuickAddShortcut.ts`, wired in `App.tsx` via a ref forwarded through `QuickAdd` (built with `forwardRef`).
- `Cmd/Ctrl+K` always focuses and selects quick-add's text, from anywhere.
- Bare `q` does the same, but only when focus isn't already in a text input/textarea/contenteditable.

## PWA
- Real icons live in `public/` (`icon.svg`, `icon-192.png` / `icon-512.png` / `icon-maskable-512.png` / `apple-touch-icon.png`), generated via `scripts/generate-icons.mjs`. Current mark: raspberry rounded square, cream-pink serif "T", small magenta dot accent (top-right) as a restrained nod to "confetti-pop" — simple monogram chosen over a more illustrated mark for legibility at 16px favicon size; revisit if a fancier logo is wanted later.
- **Share Target**: manifest declares `share_target` (GET, `/share-target`) so Android/Chrome offers "Share to TaaDaa" from other apps once installed. `src/lib/shareTarget.ts` reads the shared `text`/`title`/`url` on mount, resolves any `@project` via `resolveProjectPath`, and cleans up the URL. **iOS Safari has no Web Share Target API support at all.**
- `vercel.json` has a catch-all SPA rewrite (`/(.*) → /index.html`) — required in production for `/share-target` and any other client-only route to resolve.

## Deployment (live)
- **Frontend:** Vercel, project `vanshikasoni/taadaa`, live at **https://taadaa-five.vercel.app**. Deployed via `npx vercel --prod` from this local directory — GitHub auto-deploy is **not** connected (the `vercel link` attempt to link the GitHub repo failed silently), so pushing to GitHub alone does *not* redeploy the frontend; re-run `npx vercel --prod` after any change that should go live.
- **Backend:** Render, free Web Service, deployed from `vanshikasoni72/TaaDaa` (root directory `server`), live at **https://taadaa.onrender.com**. Render *is* connected to GitHub with auto-deploy, so `git push` alone redeploys the backend. Env vars (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`) are set directly in Render's dashboard, not from `server/.env`.
- **Repo:** https://github.com/vanshikasoni72/TaaDaa (private). Commit author uses a GitHub noreply email (`vanshikasoni72@users.noreply.github.com`), set as this repo's local `user.email` — not the global git config — specifically so the real address never appears in commit history.
- **Keep-alive:** Render's free tier sleeps after 15 min idle, which would delay reminders. An UptimeRobot monitor pings `https://taadaa.onrender.com/api/health` every 5 minutes to keep it awake. If reminders ever seem late, check that monitor is still active first.
- Both `.env` (root) and `server/.env` hold the *local-dev* copies of these values and are gitignored — production env vars live only in the Vercel/Render dashboards, not in any committed file.

## Push Notifications — built, needs your setup to go live
Real device notifications sent by TaaDaa itself, no Google account needed. **Frontend and backend are two separate deployables** — this was a deliberate architecture choice, not an accident: a reminder scheduler needs a persistent process checking "is anything due right now?", which doesn't fit Vercel's stateless serverless-function model, whereas a small standalone Node/Express server with a plain `node-cron` job is simple to reason about and can be hosted anywhere (Render/Railway/Fly.io/a VPS) independent of the Vercel-hosted frontend.

**Pieces:**
- `src/sw.ts` — custom service worker (`push` / `notificationclick` handlers), built via `vite-plugin-pwa`'s `injectManifest` strategy (see Stack note above). In dev mode `self.__WB_MANIFEST` is never injected (no build has happened), so it's precached with `|| []` — omit that fallback and the dev service worker throws on evaluation and silently fails to register.
- `src/lib/push.ts` — `subscribeToPush()` / `unsubscribeFromPush()` (permission request + `pushManager.subscribe()` + POST to the backend), and `syncReminders(tasks)` which flattens every not-done task's `reminders` into `{id, title, fireAt}` payloads (task with no `time` defaults to 09:00 on its due date) and POSTs the full set to the backend, replacing what was there — simplest sync model, no incremental diffing. Called from a `useEffect` in `App.tsx` on every `tasks` change; it's a no-op if there's no active subscription yet.
- `src/components/NotificationToggle.tsx` — the enable/disable button, pinned to the bottom of the sidebar. Only renders if `isPushSupported()` (checks for the Push API *and* that `VITE_VAPID_PUBLIC_KEY`/`VITE_PUSH_API_URL` env vars are set).
- `server/` — standalone Express app (**own `package.json`, own `node_modules`, run separately from the frontend**). `db.js` is a plain JSON-file store (`server/data.json`, gitignored) — plenty for a personal app, no hosted database needed. `index.js` exposes `POST /api/subscribe`, `POST /api/unsubscribe`, `POST /api/reminders` (replace-all for one subscription), `POST /api/test-push` (send immediately, bypassing the schedule — used for testing and could back an in-app "send test notification" button later), and runs `node-cron` every minute to find due reminders and send them via `web-push`. On a genuine 410/404 (subscription gone) it deletes the subscription; on any other send failure it deliberately leaves the reminder unsent so the *next* minute's tick retries it, rather than silently dropping it — a real transient FCM hiccup during testing got lost before this fix.

**Local setup (already done in this repo, for reference):**
1. VAPID keys generated via `npx web-push generate-vapid-keys` — public key is in root `.env` as `VITE_VAPID_PUBLIC_KEY`, both keys are in `server/.env` (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`). Both `.env` files are gitignored — regenerate your own keys if you ever suspect these leaked.
2. `cd server && npm install && npm start` runs the backend on port 4000 (`PORT` in `server/.env`).
3. Frontend's `VITE_PUSH_API_URL=http://localhost:4000` in root `.env` points at it. `npm run dev` as usual.

**Verified end-to-end** (Playwright + real Google Chrome, not Playwright's bundled Chromium — see caveat below): subscribed a real browser, POSTed a reminder with a past `fireAt`, watched `node-cron`'s next tick send it via `web-push` to Google's FCM, and confirmed the service worker's `push` handler actually called `showNotification` with the right title/body.

**Known caveats:**
- **Playwright's bundled/open-source Chromium cannot complete a real push subscription** — it lacks the proprietary Google API keys official Chrome ships with, so `pushManager.subscribe()` fails with "push service not available". Any future automated testing of this flow needs `chromium.launchPersistentContext(dir, { channel: 'chrome' })` to use a real installed Chrome, not the default bundled browser. Incognito/ephemeral contexts don't work either — Chrome disables the Push API there on purpose (`launchPersistentContext`, not `launch`, is required so it's a real non-incognito profile).
- **iOS Safari**: push only fires once TaaDaa is added to the home screen (iOS 16.4+) — a regular Safari tab will never receive one. `NotificationToggle.tsx` states this in its copy; don't promise otherwise.
- **Now deployed** — see "Deployment (live)" above for the actual URLs and how redeploys work for each half.

## Cross-Device Sync
Not in the original spec — added after the user noticed a fresh phone install had an empty task list, separate from their desktop's. Deliberately the simplest possible thing that could work, not real accounts:
- **A "sync code" is a shared key for one JSON blob on the backend, not a login.** Whoever has the 6-character code (`generateSyncCode()` in `src/lib/sync.ts`, excludes ambiguous characters like `0/O/1/I/L`) can read or overwrite that blob — there's no password, no ownership check. Fine for a personal app (or one shared with a partner), not a place to add anything sensitive.
- **Whole-blob replace, no merge**: `POST /api/sync/:code` overwrites the *entire* stored `{tasks, projects}` for that code; `GET /api/sync/:code` returns it. Same "simplest sync model" philosophy as reminders in `push.ts` — no field-level conflict resolution. If two devices edit at nearly the same moment, whichever pushes last wins, silently. Acceptable for how infrequently that's likely to happen in solo/couple use; revisit if it becomes a real problem.
- **First device** ("sync this device" in `SyncSettings.tsx`, pinned above the notification toggle in the sidebar) generates a new code and immediately pushes its current tasks/projects up.
- **Joining device** ("have a code?") pulls that code's data and **replaces its own local tasks/projects entirely** — this is the one place in the app with a native `window.confirm()`, a deliberate exception to the "no confirmation dialogs" rule, because unlike routine complete/delete actions this is a rare, one-time, genuinely destructive action (silently discarding whatever was on that device already) that isn't a quiet-undo-toast situation.
- Once a device has a code (stored in `localStorage['taadaa.syncCode']`), `App.tsx` pulls once on mount (replacing local state, showing a brief dry "syncing…" next to the theme toggle — first real use of the spec's "syncing," loading-state voice line) and pushes on every subsequent `tasks`/`projects` change, unconditionally — no debounce, mirroring `syncReminders`'s pattern.
- Same storage caveat as the rest of `server/data.json`: Render's free tier has no persistent disk guarantee across redeploys, so a sync code's data could theoretically be lost if the backend redeploys at the wrong moment. Each device's own `localStorage` copy is unaffected either way, so worst case is re-pushing from whichever device still has the data.

## Scope Rules — Ship Lean
V1 = quick-add + calendar + tag highlighting, done beautifully. **All 7 phases are done** — this is a complete v1, not a work-in-progress:
- **Phase 1 (done):** quick-add, Today view, priority, projects with sub-categories, sidebar, task editing.
- **Phase 1.5 (done):** Calendar view (week + month) with tag highlighting + workload heat-strip, bigger day cells showing content inline.
- **Phase 3 (done):** Recurring tasks + subtasks.
- **Phase 4 (done):** Dark mode, manual toggle + auto system default.
- **Phase 5 (done):** PWA — install flow, icons, share-sheet capture. (Android home-screen widget / iOS Shortcut aren't part of this: they're OS-level features outside any web codebase, not an unfinished part of the app.)
- **Phase 6 (done):** Visual/motion polish — hand-drawn checkmark, consistent motion tiers, undo toast, Q/Cmd+K keyboard shortcut. (The dot-grid texture lives on the calendar view only, per spec — it was never meant to be app-wide paper-grain.)
- **Phase 7 (done):** Web Push notifications — VAPID keys, service worker, subscribe flow, and the standalone `server/` scheduler backend, all built and verified end-to-end locally (see "Push Notifications" above). Going live in production still requires deploying `server/` and pointing `VITE_PUSH_API_URL` at it — a deployment/hosting step for the user to do, not unfinished app work.

Deliberately out of scope, always: karma/points, streak counters, team sharing, complex filters, third-party integrations. (No Google Calendar sync — Phase 7 is Web Push instead.)

Cross-Device Sync (see above) was added after v1 shipped and deployed — a real example of the "refinements only" rule below in action: it was scoped to the simplest thing that solved the actual reported problem (one device's data not appearing on another) rather than building toward full accounts/auth.

**Since this is a complete v1:** new requests should default to bug fixes, visual polish, or small refinements within the existing architecture (data model, views, components) described in this file. If a request implies a genuinely new feature or structural change (new view, new data field, new external integration), it's worth a quick check with the user that they actually want to expand scope rather than assuming it's expected — this file existing being "done" is itself useful signal that surprises should be flagged, not silently built.

## Non-Negotiables
- One input box for adding tasks — never a multi-field "new task" form (the toolbar adds icon *shortcuts* on top of the one input, it doesn't replace it with a form).
- No confirmation dialogs for routine actions (delete, complete) — quiet undo toast instead. Task editing follows the same spirit: auto-save on change, no explicit Save button.
- Mobile-first: build and test at mobile width first. Sidebar in particular is mobile-drawer-first, desktop-always-visible-second.
- Whitespace and color do the organizing — avoid adding UI chrome (borders, dividers, icons-for-icons'-sake) to create structure.
- Keyboard-first on desktop — Q / Cmd+K jumps to quick-add.

## Verifying UI Changes
No `chromium-cli` in this environment. Use Playwright directly: install it in the scratchpad directory (not the project's `package.json`) with `npm install playwright` + `npx playwright install chromium`, then drive the dev server with a small script. Always check both a mobile viewport (~390px) and a desktop viewport, and check `page.on('console')` / `pageerror` for silent failures. For anything touching push notifications specifically, use a real installed Chrome via `channel: 'chrome'` + `launchPersistentContext` (see Push Notifications caveats above) — the default bundled Chromium cannot complete a real subscription.

**Process hygiene:** dev servers started with `(nohup npm run dev -- --port 5183 &)` don't always die cleanly between sessions — if a port is unexpectedly "in use," check for and kill stale processes (`Get-NetTCPConnection -LocalPort <port> -State Listen` + `Stop-Process` in PowerShell tends to be more reliable than `lsof` in this Windows/git-bash environment) before assuming the running server has your latest code. A stale zombie server on the port you *think* you're testing against, silently serving old code, cost real debugging time this session.
