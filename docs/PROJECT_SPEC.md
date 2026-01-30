# Project: Kaynak – Newsroom Project Management Tool

## Overview
Build a newsroom project management tool for journalists to manage stories from ideation to publication, with emphasis on fact-checking, collaboration, and quality gates to prevent publishing unverified content.

## Tech Stack
- **Frontend**: React with TypeScript
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas (Remote)
  - Connection URI stored in .env (never commit!)
  - Use dotenv for environment variables
- **Text Editor**: Tiptap (rich text with version control)
- **File Storage**: Plan for AWS S3 or Cloudflare R2 (implement later)
- **Styling**: Tailwind CSS
- **State Management**: React Context or Zustand

## Core Design Principles (CRITICAL)
1. **Human-in-the-loop ALWAYS**: No automated state transitions. Every action requires explicit user confirmation.
2. **Simplicity first**: Clean UI, minimal colors, user-defined categories
3. **Cost-conscious**: Use free/cheap solutions, no expensive infrastructure
4. **Journalist-centric**: No tutorials, no sample data - professionals only
5. **Quality gates**: Visual story states and fact-checking prevent half-finished publishing

## Data Model

### Main Collections

**stories** – headline, description (min 140 chars), state, workflowId, producer, editors, teamMembers, deadlines, currentScriptVersion, researchNotes, categories, checklist, seriesId, useSeriesResources, createdBy, timestamps, archivedAt, deletedAt (soft delete).

**States**: `IDEA` | `RESEARCH` | `SCRIPTING` | `MULTIMEDIA` | `FINALIZATION` | `PUBLISHED`

**script_versions** – storyId, version, content (Tiptap HTML/JSON), wordCount, editedBy, editedAt, locked, lockedBy, lockedAt, lockExpires (15-min timeout).

**fact_checks** – storyId, scriptVersion, textSelection, type (`claim` | `question` | `source_needed`), status (`pending` | `verified` | `disputed`), note, assignedTo, createdBy, verifiedBy, timestamps.

**fact_check_comments** – factCheckId, userId, text, attachments, createdAt.

**sources** – storyId/seriesId, name, contact, role, notes, status, verifiedBy, verifiedAt, attachments.

**series** – name, description, overview, storyIds (ordered), createdBy, archivedAt.

**users** – email, password (hashed), name, avatar, role, workspaceId, notificationSettings.

**workflows** – workspaceId, name, isDefault, states (name, order, defaultChecklist).

**activity_log** – storyId, userId, action, details, timestamp.

## Core Features

### Phase 1: MVP
1. **Authentication** – email/password, JWT (done)
2. **Kanban Board** – columns per workflow state, draggable story cards, filters (All, My Stories, Overdue, By Category), full-text search
3. **Story Detail View** – header (headline, state, categories), sidebar (People, Deadlines, Checklist, Attachments, Comments), tabs (Overview, Script, Research, Media, Activity)
4. **Script Editor** – Tiptap, lock (one editor at a time), version control, auto-save 10s
5. **Fact-Checking** – highlight → Add Fact-Check, visual indicators (yellow/green/red), tooltips, threaded comments
6. **Export** – PDF and DOCX (comments/fact-checks excluded)

### Phase 2+
- Story Series, custom workflows, calendar view, list view, bulk operations

## UI/UX

- **Kanban cards**: Headline, Producer/Editor avatars, Deadline (color-coded), Comment count. Drag → confirmation modal before state change.
- **Story detail**: Lock indicator, fact-checks sidebar, version dropdown. Mobile: sidebar accordion, swipeable tabs.
- **Fact-check**: No inline citation numbers; hover tooltip for source/verification. Clean copy-paste.
- **Colors**: Deadline green/yellow/red. Fact-check yellow/green/red.

## Critical Rules
1. Never automate state changes – user must confirm.
2. Script lock in DB, 15-min timeout.
3. Store full script content per version.
4. Soft delete stories (30-day trash).
5. Comments internal only; exclude from export unless explicit.

## Folder Structure
```
/client/src
  /components
    /Kanban
    /StoryDetail
    /ScriptEditor
    /FactCheck
  /contexts (or /stores)
  /hooks
  /utils
  /pages
```

Full data model field details and security notes are in the original project brief.
