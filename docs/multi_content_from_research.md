# Multiple Content Types from One Research – Design

## The problem

The current workflow is optimized for **one deliverable per story**: one research → one script → one output (e.g. one YouTube video). In practice, the same research often feeds **multiple formats**:

- **YouTube video** (longer script, 8–15 min)
- **Instagram Reels** (short script, 60–90 sec, different hook)
- **TikTok** (vertical, different tone)
- **Article / newsletter** (text-only, different structure)

Each format needs its **own script** and can have its **own deadlines and workflow state**, but they all share the **same research**. Users need a single place (dashboard) to:

1. See one “research story” and all outputs derived from it
2. Create new outputs (e.g. “Create Reels from this research”)
3. Track each output’s script and state (scripting → multimedia → published) independently

---

## Current model (recap)

- **Story** = one unit: headline, description, state, researchNotes, currentScriptVersion, …
- **script_versions** = keyed by `storyId`; one story has one logical script (versioned).
- **Parent/child** = package grouping (e.g. “Housing series”); parent has no script, children are full stories. Not used for “one research, many outputs.”

So today: one story = one script = one deliverable. Research is stored on that same story.

---

## Option A: Derived stories (recommended)

**Idea:** Keep “one story = one script.” Introduce **derived stories**: an output story (e.g. “Reels – Housing crisis”) **references the research story** and gets its own script and workflow.

### Data model

**Story**

- **`sourceStoryId`** (optional): `ObjectId` ref to another Story. When set, this story is an **output** derived from that story’s research.
- **`contentFormat`** (optional): `String` enum, e.g. `'youtube' | 'instagram_reels' | 'tiktok' | 'article' | 'other'`. Labels what kind of deliverable this story is.

Rules:

- The **source** story is the one where research lives (researchNotes, possibly state = research or scripting). It can also be the “primary” output (e.g. YouTube) with its own script.
- **Derived** stories have `sourceStoryId` set and their own script; they do not duplicate researchNotes (they “use” the source’s research). Optionally you can **copy** researchNotes when creating a derived story so it’s editable per output, or keep one source of truth and show source’s research in the UI when viewing a derived story.
- `contentFormat` helps the dashboard show “YouTube”, “Reels”, etc., and filter/group.

### API

- **Create story:** Allow `sourceStoryId` and `contentFormat`. If `sourceStoryId` is set, optionally copy `researchNotes` from source into the new story (or leave empty and resolve from source in UI).
- **List / get story:** Return `sourceStoryId`, `contentFormat`, and when loading a story, optionally return **derived stories** (list of stories where `sourceStoryId = this story`) so the dashboard can show “Outputs: YouTube, Reels”.

### Dashboard (single place for research + all outputs)

1. **Research / primary story detail**
   - Show research (researchNotes) and, if this story has a script, the primary script (e.g. YouTube).
   - New section: **“Content from this research”** or **“Outputs”**:
     - List derived stories (Reels, TikTok, article, …) with `contentFormat` label, state, link to open that story.
     - Button: **“+ Add output”** → choose format (Reels, TikTok, …) → create derived story (with optional copy of researchNotes) and open it (or open a “New output” modal pre-filled with sourceStoryId + format).
2. **Derived story detail**
   - Show “Derived from: [link to source story]” and `contentFormat` (e.g. “Instagram Reels”).
   - Script tab = this story’s script only. Research can be shown as read-only from source or as copied notes.
3. **Board / list**
   - Cards can show a small `contentFormat` badge (e.g. “Reels”) so users see format at a glance.
   - Filter by `contentFormat` if needed.

### Pros and cons

- **Pros:** Reuses existing Story and ScriptVersion model; no new collections. Each output is a first-class story (comments, fact-checks, deadlines). Clear “source → derived” relationship.
- **Cons:** Research can live only on the source (or be copied). If you want “one research, many scripts” without many story cards, use Option B.

---

## Option B: Outputs / deliverables (one story, many scripts)

**Idea:** One **story** holds the research and metadata; multiple **outputs** (deliverables) belong to that story, each with its own format, script, and state.

### Data model

- **Story** unchanged for research (researchNotes, headline, description, state could represent “overall” or just research phase).
- New collection **Output** (or **Deliverable**):
  - `storyId` (ref Story)
  - `format`: e.g. `'youtube' | 'instagram_reels' | 'tiktok' | 'article'`
  - `headline` or `title` (e.g. “Housing crisis – Reels cut”)
  - `scriptVersionId` or embed script content (or link to ScriptVersion with a different key, e.g. `outputId` instead of storyId)
  - `state`: same workflow (scripting, multimedia, finalization, published) or simplified
  - `currentScriptVersion`, deadlines, etc.

Script versions would need to be keyed by **output** (e.g. `outputId`) instead of (or in addition to) `storyId`. So either:

- **ScriptVersion** gets `outputId` (optional); when set, script belongs to that output; when null, script belongs to story (current behaviour), or
- Only outputs have scripts; “research-only” story has no script.

### Dashboard

- **Story detail** = research + list of **Outputs**. Each output has its own row: format, headline, state, “Edit script” → opens script editor for that output.
- Board could stay story-centric, with each card showing “YouTube, Reels” as tags; clicking could go to story and then to the right output.

### Pros and cons

- **Pros:** One story, one research, many outputs in one place; no proliferation of story cards.
- **Cons:** New collection and APIs; script versioning and fact-checks must be updated to work with outputs (e.g. fact_checks keyed by outputId + scriptVersion). Bigger change.

---

## Recommendation

- **Short term / minimal change:** **Option A (derived stories)**. Add `sourceStoryId` and `contentFormat` to Story; dashboard shows “Content from this research” and “+ Add output” on the source story; each output is a normal story with its own script and workflow. Single dashboard = the **source story detail** where users see research and all derived outputs.
- **Later, if needed:** If you want one card per “topic” with multiple scripts inside it and no extra story cards, consider **Option B** and introduce Output/Deliverable and wire script/fact-check to it.

---

## Summary

| Aspect | Option A – Derived stories | Option B – Outputs/Deliverables |
|--------|----------------------------|---------------------------------|
| Model | Same Story + ScriptVersion; add sourceStoryId + contentFormat | New Output collection; scripts keyed by output |
| Research | On source story; derived stories link to it (or copy) | On story; outputs reference story |
| Dashboard | Source story detail = research + list of derived stories (outputs) | Story detail = research + list of outputs with scripts |
| Complexity | Low (add 2 fields + UI) | Higher (new entity, script/fact-check wiring) |

To **handle different kinds of content creation from a single dashboard**, use the **source story** as that dashboard: open the research story and from there see and create all outputs (YouTube, Reels, etc.), each as its own story with its own script and state.
