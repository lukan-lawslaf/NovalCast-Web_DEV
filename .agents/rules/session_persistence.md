# Workspace Rule: Antigravity Session Continuity

1. At session initialization or when starting any user task:
   - Read `.antigravity/context.md` and `.antigravity/state.json`.
   - Restore current project objectives, pending steps, and active work context.

2. At task completion or state transition:
   - Update `.antigravity/context.md` and `.antigravity/state.json`.
   - Log milestone updates to `.antigravity/history.log`.
