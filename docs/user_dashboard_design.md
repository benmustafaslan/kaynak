# User Dashboard Design — Kaynak

**Status:** Design only (not implemented)  
**App:** Kaynak — Newsroom project management  
**Audience:** Logged-in users; optional workspace-scoped variant.

---

## 1. Purpose

A **user dashboard** gives a single, at-a-glance view of:

- **Where things stand** — stories assigned to the user, pending fact-checks, upcoming deadlines.
- **What’s recent** — latest activity across the workspace(s) the user cares about.
- **Quick access** — jump to Board, Ideas, a story, or another workspace.

It is the natural “home” after login (and optionally after choosing a workspace), reducing the need to open Board, Stories, or Archive to see what needs attention.

---

## 2. Placement in the App

Two possible placements (can support both):

| Option | Route | When shown | Scope |
|--------|--------|------------|--------|
| **A. Global dashboard** | `/` or `/w` (before workspace segment) | After login; user may have one or many workspaces | Cross-workspace summary + workspace list |
| **B. Workspace dashboard** | `/w/:workspaceSlug/dashboard` or make it the default index of a workspace (e.g. replace “redirect to board” with dashboard) | After a workspace is chosen | Single-workspace: my tasks, recent activity, deadlines |

- **Recommendation:** Start with **B (workspace dashboard)** as the main “home” when inside a workspace (e.g. default route `dashboard` with Board, Stories, Ideas, Archive in nav). Option A can be added later for users in multiple workspaces.

---

## 3. Layout (High-Level)

- **Top:** Same app header as today (workspace name, user menu, primary nav: Dashboard, Board, Stories, Ideas, Archive, Preferences).
- **Main area:** Single scrollable page composed of **widgets** in a responsive grid (e.g. 1 col on mobile, 2–3 on desktop). Widgets can be reordered later; for the example design, order below is the default.

```
+------------------------------------------------------------------+
|  [Logo]  Workspace name    [ Dashboard | Board | Stories | Ideas | Archive ]   [Invite] [Prefs] [User]  |
+------------------------------------------------------------------+
|                                                                  |
|  +---------------------------+  +---------------------------+   |
|  | Welcome, {name}           |  | Quick stats               |   |
|  | Short greeting + date     |  | • Stories (mine / total)  |   |
|  +---------------------------+  | • Pending fact-checks     |   |
|                                 +---------------------------+   |
|  +------------------------------------------------------------------+
|  | Recent activity (last 24–48h)                                    |
|  | List of activity items with story link, user, action, time       |
|  +------------------------------------------------------------------+
|  +---------------------------+  +---------------------------+   |
|  | Stories I’m on             |  | Fact-checks needing me    |   |
|  | Producer/editor/assigned  |  | Pending + assigned to me  |   |
|  +---------------------------+  +---------------------------+   |
|  +---------------------------+  +---------------------------+   |
|  | Upcoming deadlines         |  | Quick actions             |   |
|  | Next 7 days, by story      |  | New story, Board, Ideas   |   |
|  +---------------------------+  +---------------------------+   |
+------------------------------------------------------------------+
```

No sidebar required for the dashboard itself; the existing top/side nav is enough.

---

## 4. Widgets (Detailed)

### 4.1 Welcome / Greeting

- **Content:** “Good morning/afternoon/evening, {user.name}” and current date.
- **Data:** `user` from auth store.
- **Behavior:** Static; no click.

### 4.2 Quick stats

- **Content:** Small cards or list:
  - **Stories:** e.g. “3 assigned to you” and optionally “12 in workspace” (if we have counts).
  - **Fact-checks:** “2 pending” or “2 need your attention” (pending + assigned to me).
- **Data:** From “Stories I’m on” and “Fact-checks needing me” (see below); can be same API, just counts.
- **Behavior:** Optional: click “2 pending” → scroll to or open Fact-checks widget / Stories.

### 4.3 Recent activity

- **Content:** List of recent activity entries (e.g. last 20): headline (link to story), user who acted, action type, relative time.
- **Data:** Existing `activityApi.getRecent(limit)`.
- **Behavior:** Headline → navigate to story detail. Optional: filter by “my stories” or “all”.

### 4.4 Stories I’m on

- **Content:** Stories where the user is producer, editor, or in teamMembers (and not archived). Show headline, state, deadline (if any). Limit to e.g. 5–10, “View all” → Board or Stories with a “mine” filter.
- **Data:** New or extended API: e.g. `GET /users/me/stories` or `GET /stories?assignedTo=me` (workspace-scoped).
- **Behavior:** Row click / “Open” → Story detail.

### 4.5 Fact-checks needing me

- **Content:** Fact-checks in **pending** (and optionally disputed) that are **assigned to the current user** in this workspace. Show story headline, snippet or type, age. Limit to 5–10, “View all” → Story detail with fact-check panel.
- **Data:** New or extended API: e.g. `GET /fact-checks?assignedTo=me&status=pending` (workspace-scoped) or aggregated from stories.
- **Behavior:** Click → open that story and focus fact-check panel / comment thread.

### 4.6 Upcoming deadlines

- **Content:** Stories with a deadline in the next 7 days (or 14), ordered by date. Show headline, deadline, state. Color hint: green / yellow / red by proximity (align with existing deadline UX in Kanban).
- **Data:** From stories list with `deadline` in range; could be same as “Stories I’m on” filtered by deadline, or a dedicated `GET /stories?deadlineNext=7`.
- **Behavior:** Click → Story detail.

### 4.7 Quick actions

- **Content:** Buttons or links: **New story**, **Board**, **Ideas inbox**, **Archive** (and later: New piece, etc.).
- **Data:** None; routes only.
- **Behavior:** Navigate to the corresponding route or open “New story” modal if that lives on Board.

---

## 5. Global Dashboard (Option A) — Extra Widgets

If we add a dashboard at `/` or `/w` (before picking a workspace):

- **Workspaces:** List of workspaces the user is in (name, role, last used?). Click → enter that workspace (e.g. `/w/:slug` or `/w/:slug/dashboard`).
- **Cross-workspace summary:** Optional high-level counts per workspace (e.g. “3 workspaces, 5 stories assigned in total”) and maybe one combined “Recent activity” that spans workspaces (would need a new API).
- **Create / Join workspace:** Prominent “Create workspace” and “Join with invite” (same as current WorkspacePicker).

The rest of the layout can mirror the workspace dashboard but with data aggregated or listed per workspace.

---

## 6. Data Requirements (Summary)

| Widget              | Source | Notes |
|---------------------|--------|--------|
| Welcome             | Auth store | Already have |
| Quick stats         | Derived from Stories + Fact-checks | Counts only |
| Recent activity     | `activityApi.getRecent(limit)` | Exists |
| Stories I’m on      | New: `GET /users/me/stories` or `GET /stories?assignedTo=me` | Workspace-scoped |
| Fact-checks needing me | New: `GET /fact-checks?assignedTo=me&status=pending` or via stories | Workspace-scoped |
| Upcoming deadlines | New query on stories (e.g. `deadline` in next 7 days) or filter on stories API | Workspace-scoped |
| Quick actions       | None | Routes only |

---

## 7. Empty and Loading States

- **Loading:** Skeleton placeholders or spinners per widget; avoid one big full-page loader so the layout is visible.
- **No data:** Per-widget messages, e.g. “No recent activity”, “No stories assigned to you”, “No upcoming deadlines”. Keep the widget so the layout is stable and the user knows where to look later.
- **New user / no workspace:** If we ever show dashboard before workspace is chosen, show only workspace list + create/join; no story/fact-check widgets.

---

## 8. Responsiveness and A11y

- **Grid:** 1 column on small screens; 2 columns from tablet up; optionally 3 for large screens for stats + quick actions.
- **Touch:** All list rows and buttons have a large enough hit area; “View all” and primary actions are clearly tappable.
- **A11y:** Headings per widget (e.g. “Recent activity”, “Stories I’m on”); list semantics; skip link to main content; same keyboard and screen-reader behavior as the rest of the app.

---

## 9. Future Enhancements (Out of Scope for First Version)

- **Customizable layout:** User reorders or hides widgets.
- **Filters:** e.g. “Recent activity: all / my stories only”.
- **Notifications:** In-app notification center surfaced on the dashboard (e.g. “3 new comments”, “2 fact-checks assigned”).
- **Charts:** Simple charts (e.g. stories by state, pieces published this week) if we add analytics later.

---

## 10. Example Design File (Reference Only)

This section is a **static example** of how the dashboard could look in a design tool (e.g. Figma). No implementation.

**Frame: Workspace dashboard — Desktop (1280×800)**

- **Header:** 64px height. Left: “Kaynak” + workspace name “Newsroom Alpha”. Center: Nav pills “Dashboard” (active), “Board”, “Stories”, “Ideas”, “Archive”. Right: “Invite”, “Preferences”, user avatar + name.
- **Main:** 24px padding from edges. Grid: 12 columns, 24px gutter.
  - Row 1: Welcome card (cols 1–6), Quick stats (cols 7–12). Card style: light background, 1px border, 16px padding, 12px radius.
  - Row 2: Recent activity full width (cols 1–12). Same card style; list 8 items.
  - Row 3: “Stories I’m on” (cols 1–6), “Fact-checks needing me” (cols 7–12).
  - Row 4: “Upcoming deadlines” (cols 1–6), “Quick actions” (cols 7–12).
- **Typography:** Same as app (e.g. system font stack). Widget titles: 14px semibold, uppercase or small-caps; body 14px; timestamps 12px, muted.
- **Colors:** Use existing CSS variables (e.g. `--app-bg`, `--accent-primary`, deadline green/yellow/red, fact-check yellow/green/red for small indicators).

**Frame: Workspace dashboard — Mobile (375×812)**

- Same header, collapsed to hamburger + “Dashboard” + user avatar if needed.
- Single column: Welcome, Quick stats, Recent activity, Stories I’m on, Fact-checks, Deadlines, Quick actions. Full-width cards, 16px horizontal padding.

This design file is for reference only; implementation will follow the same structure and use real components and APIs.
