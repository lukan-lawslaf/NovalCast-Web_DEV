# Antigravity Agent Directives — NovelCast

## 1. Session State & Context Persistence Protocol (`claude-remember`)

Whenever you start a conversation or turn in this workspace:

1. **Mandatory Context Loading**:
   - Check and read [.antigravity/context.md](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/.antigravity/context.md) and [.antigravity/state.json](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/.antigravity/state.json) before taking action.
   - Resume directly from the state and tasks left off in the previous session.
   - Briefly confirm to the user that context has been restored from `.antigravity/`.

2. **Continuous State & Memory Compression**:
   - When completing tasks or modifying files, update [.antigravity/context.md](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/.antigravity/context.md) and [.antigravity/state.json](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/.antigravity/state.json) with:
     - The current timestamp and active focus.
     - Files modified or created.
     - Completed and pending tasks.
     - Compressed summary of recent milestones (preventing bloated text).
   - For major milestones, append a summary entry to [.antigravity/history.log](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/.antigravity/history.log).

---

## 2. Collaborative Planning & Feature Review (`review`)

When designing, planning, or scoping any new feature or architectural change:

1. **User Drives Logic & Feature Decisions**:
   - Do NOT dump a monolithic, pre-decided implementation plan onto the user.
   - The user is the Lead Product Architect; the agent is the Technical Implementer.
2. **Interactive Inquiry with Options**:
   - Formulate focused questions using the `ask_question` tool with concrete options (Option A, Option B, Option C, plus custom write-in).
   - Let the user decide UX flows, feature tradeoffs, layout placement, and behavior.
3. **Execute the Co-Designed Plan**:
   - After the user submits their choices, summarize the agreed blueprint concisely and execute the code cleanly.

---

## 3. Workspace Overview
- Refer to [.antigravity/project.md](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/.antigravity/project.md) for architecture, page maps, and styling conventions.
