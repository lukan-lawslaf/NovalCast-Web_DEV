---
name: claude-remember
description: Persistent memory and context compression protocol. Uses and updates the local .antigravity folder to maintain state, compress history, and resume coding sessions seamlessly from where they left off.
argument-hint: "[restore|sync|compress|status]"
metadata:
  author: antigravity
  version: "1.0.0"
---

# Claude Remember — Persistent Memory Protocol

Maintains persistent local context, state tracking, and memory compression using the `.antigravity/` folder across IDE sessions and restarts.

## When to Use

- When the user asks to "remember", "load context", "resume session", or "save state".
- At the start of any conversation turn in a project containing `.antigravity/`.
- When concluding a task to compress recent changes and update pending steps.
- When continuing work on a project after closing and reopening Antigravity.

---

## Core Protocol

### 1. Mandatory Context Load (Session Start / Resume)
Whenever this skill is triggered or a session resumes:
1. **Locate `.antigravity/`**:
   - Check the root of the active workspace for `.antigravity/context.md` and `.antigravity/state.json`.
   - If missing, initialize them immediately with the project overview, workspace file map, and active state.
2. **Read Active Memory**:
   - Read `.antigravity/context.md` to identify the current objective, pending tasks, file map, and design conventions.
   - Read `.antigravity/state.json` to inspect the machine-readable state (`last_updated`, `status`, `active_document`, `completed_tasks`, `active_tasks`).
3. **Confirm Context Restoration**:
   - Briefly acknowledge to the user that context has been restored from `.antigravity/`, summarize the active focus, and state the immediate next steps.

---

### 2. Context Compression & Memory Hygiene (Active Session / Task End)
As work progresses and tasks are completed, keep the local context clean and dense:

1. **Compress Session History**:
   - Do NOT let `.antigravity/context.md` become an unreadable dump of raw logs.
   - Summarize older back-and-forth into concise bullet points under **Recent Milestones**.
   - Move completed tasks from `active_tasks` to `completed_tasks`.
2. **Update Machine State (`.antigravity/state.json`)**:
   - Update `last_updated` with the current ISO/local timestamp.
   - Update `active_document` to the file currently being worked on.
   - Update `status`, `active_tasks`, and `recent_changes`.
3. **Audit Logging (`.antigravity/history.log`)**:
   - Append a brief dated entry (3–5 bullet points) summarizing major architectural decisions, files created/modified, and milestone completions.

---

### 3. File Schema Reference

- **`.antigravity/context.md`**:
  - `## 1. Project Overview` (Name, type, tech stack, key experience)
  - `## 2. Workspace File Map` (Table of primary files and their purpose)
  - `## 3. Current Session & Continuity State` (Status, focus, recent milestones)
  - `## 4. Pending / Next Steps` (Actionable checklist of what remains)
  - `## 5. Agent Instructions for Resuming` (Step-by-step restoration directives)

- **`.antigravity/state.json`**:
  ```json
  {
    "project": "<Project Name>",
    "version": "1.0.0",
    "last_updated": "<Timestamp>",
    "last_session_id": "<Conversation ID>",
    "status": "active|ready|in-progress",
    "active_document": "<Filename>",
    "current_focus": "<Brief description of current goal>",
    "active_tasks": ["<Task 1>", "<Task 2>"],
    "completed_tasks": ["<Completed 1>"],
    "recent_changes": ["<Change 1>"]
  }
  ```
