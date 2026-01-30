# Parent Stories (Story Packages) – Design Suggestion

## Goal

Allow related stories (e.g. Update → Educational follow-up → Commentary) to be grouped under a **parent story** that acts only as a container. Parent stories:

- Do **not** have a script (no ScriptVersion, no script tab).
- Do **not** go through the full workflow as a single “story” (they’re a package).
- **Do** have a headline (and optional short description) and hold an ordered list of child stories.

Child stories are normal stories: they have scripts, workflow states, deadlines, etc., and optionally reference their parent.

---

## Recommended Approach: Same Story Model with `kind` and `parentStoryId`

Use a single `Story` collection and distinguish behaviour with:

1. **`kind`**: `'story'` (default) | `'parent'`
2. **`parentStoryId`**: set only on **child** stories; references the parent story’s `_id`.
3. **Child order**: optional `childOrder: [ObjectId]` on the **parent** to define sequence (Update first, then Educational, then Commentary).

### Why this over a separate “StoryGroup” model?

- One collection: simpler queries, same APIs with small branching.
- Parent appears in story list/detail; you can show “Package: X” and list children.
- Reuses permissions, createdBy, timestamps; no new routes for a new resource.
- Script/version logic already keys off `storyId`; you simply never create ScriptVersions for parents (and hide script UI for them).

### Relaxed rules for parent stories

| Field            | Normal story              | Parent story                          |
|-----------------|---------------------------|----------------------------------------|
| `headline`      | Required                  | Required (e.g. “Housing series Q1”)   |
| `description`   | Required, min 140 chars   | Optional or much shorter (e.g. 0–500) |
| `state`         | Full workflow             | Optional; e.g. fixed “PACKAGE” or same enum but not used for script |
| Script / ScriptVersion | Yes                 | No (never create; hide in UI)         |
| Script tab      | Shown                     | Hidden or disabled                     |

---

## Data Model Changes

### Server (Story model)

- **`kind`**: `{ type: String, enum: ['story', 'parent'], default: 'story' }`
- **`parentStoryId`**: `{ type: ObjectId, ref: 'Story', default: null }`  
  - Only set when this story is a **child** of a parent.
- **`childOrder`**: `[{ type: ObjectId, ref: 'Story' }]`  
  - Only on **parent** stories; defines order of child stories (Update, then Educational, then Commentary).

Validation:

- If `kind === 'parent'`: allow short or empty `description`; do not require script-related fields.
- If `parentStoryId` is set: referenced document must exist and have `kind === 'parent'`.
- Optionally: a story with `kind === 'parent'` must not have `parentStoryId` set (no nested parents if you want to keep it simple).

### Client (types/story.ts)

- Add `kind?: 'story' | 'parent'`.
- Add `parentStoryId?: string`.
- Add `childOrder?: string[]` (for parent stories).
- Optionally: extend API/Story type with populated `childStories?: Story[]` when loading a parent.

---

## API Behaviour

- **Create story**
  - If creating a “parent” story: accept headline + optional short description; set `kind: 'parent'`; no script.
  - If creating a normal story: allow optional `parentStoryId`; if set, validate parent exists and `kind === 'parent'`, and append this story’s id to parent’s `childOrder` (or set childOrder in a separate update).
- **List stories**
  - Board/Kanban: either **exclude** `kind === 'parent'` from the board, or show them as a special row/card that expands to show children (your choice).
  - Story detail: when loading a parent, include `childStories` (ordered by `childOrder`) so the UI can show the list of linked stories.
- **Get by id**
  - Return `kind`, `parentStoryId`, `childOrder` so the client can show “Part of package: X” and “Related stories” / “Child stories”.
- **Script versions**
  - Do not create or edit ScriptVersions for stories with `kind === 'parent'` (backend can check and reject; frontend never shows script tab for parents).
- **Delete / archive**
  - Define policy: e.g. archiving a parent archives only the container (children keep their `parentStoryId` but parent is archived), or prevent archiving parent while it has children; same for delete.

---

## UI Sketch

1. **Create**
   - “New Story” (default) vs “New story package” (parent).
   - Package: headline + optional short description; creates with `kind: 'parent'`.
2. **Board**
   - Either hide parent stories from the board and only show them in a “Packages” view or inside story detail, or show a parent as a single card that expands to show child cards (or links).
3. **Story detail**
   - If story has `parentStoryId`: show “Part of package: [link to parent]” and optionally “Siblings” (other children of same parent, ordered by parent’s `childOrder`).
   - If story is parent (`kind === 'parent'`): no Script tab; show “Child stories” list (ordered by `childOrder`) with links to each; allow “Add story to package” (create or link existing story and update `childOrder`).
4. **Linking**
   - When creating a normal story, optional “Add to package” → pick parent → set `parentStoryId` and append to parent’s `childOrder`.
   - Or from parent’s detail: “Add existing story to package” → pick story → set its `parentStoryId`, append to `childOrder`.

---

## Optional: Order and labels

- **`childOrder`** on the parent gives a canonical sequence (Update → Educational → Commentary).
- Optionally add a **label** per child (e.g. “Update”, “Educational”, “Commentary”) either as:
  - A category or tag on the child story, or
  - A small structure on the parent, e.g. `childLabels: { [storyId]: 'Update' | 'Educational' | 'Commentary' | … }` if you want the label to live with the package rather than the story.

---

## Summary

- **Same Story model**, with `kind: 'story' | 'parent'`, `parentStoryId` on children, and `childOrder` on parents.
- **Parents**: headline (+ optional short description), no script, no ScriptVersion; they only group and order children.
- **Children**: full story behaviour; optional `parentStoryId` and position in parent’s `childOrder`.
- **API**: create/list/get respect `kind` and relations; script APIs ignore or reject parents.
- **UI**: create parent vs story; story detail shows “Part of package” / “Child stories”; script tab hidden for parents.

This gives you a simple mechanism to “pin related stories together” (Update → Educational → Commentary) without turning parent stories into full workflow items or giving them scripts.
