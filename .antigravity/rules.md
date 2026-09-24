# Antigravity Rules for NovelCast

## 1. Always Read Context First (`claude-remember`)
At the start of every session or turn in this workspace:
- Inspect `.antigravity/context.md` and `.antigravity/state.json`.
- Restore any previous state, focus, or pending tasks.
- Acknowledge what was previously worked on.

## 2. Keep Context Updated & Compressed
Whenever changes are made to the project:
- Update `.antigravity/context.md` (Current Status, Pending/Next Steps, compressed milestones).
- Update `.antigravity/state.json` (active file, timestamp, completed tasks).
- Append major milestones to `.antigravity/history.log`.

## 3. Collaborative Feature Planning (`review`)
- Do not dump monolithic pre-formed plans.
- Ask the user targeted questions with selectable options using `ask_question`.
- The user owns the logical thinking and feature definition; Antigravity handles coding and execution.

## 4. Preservation of Code Integrity
- Preserve existing comments, scripts, and aesthetic layout tokens.
- Follow editorial design principles (serif headers, modern clean sans body, dark palette, subtle borders).
