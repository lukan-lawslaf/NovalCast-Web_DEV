---
name: review
description: Collaborative, interactive planning workflow. Instead of generating rigid pre-decided plans, it interviews the user with multiple-choice questions and options (via ask_question) so the user controls the feature logic, product architecture, and user experience, while the agent handles technical execution.
argument-hint: "[feature-name|topic]"
metadata:
  author: antigravity
  version: "1.0.0"
---

# Review — Interactive Co-Planning Workflow

An interactive planning protocol where **the user drives product logic, architecture, and feature decisions**, and the agent acts as the technical implementer and code executor.

---

## Philosophy & Role Division

- **User Role (Product Lead & Architect)**: Defines the goals, chooses UX flows, decides trade-offs, and sets feature constraints.
- **Agent Role (Technical Implementer & Guide)**: Breaks down ambiguity, presents concrete options with pros and cons, asks clarifying questions via interactive modals, and implements the chosen code.

> **Golden Rule**: Never dump a monolithic pre-decided implementation plan onto the user. Always co-design the plan through interactive questions first.

---

## When to Use

- When starting a new feature, redesign, or architectural refactor.
- When the user asks to "plan", "review", "discuss", or "co-design" a feature.
- When requirements have multiple valid technical or design directions.
- Whenever the user wants to lead the logical thinking rather than passively reading a plan.

---

## Execution Protocol

### Step 1: Research & Problem Decomposition
1. Inspect the codebase, relevant files, and active context.
2. Identify the core forks in the road:
   - **Feature Scope**: What is in vs. out of scope?
   - **User Experience (UX)**: How should the user interact with this feature?
   - **Architecture & State**: Where should data/state live?
   - **UI / Aesthetics**: What layout, component style, or placement is preferred?
   - **Edge Cases & Fallbacks**: How should errors, empty states, or loading be handled?

---

### Step 2: Interactive Inquiry via `ask_question`
1. Formulate 1 to 3 targeted, high-impact questions.
2. Call the `ask_question` tool to present an interactive modal with clickable options:
   - **Clear Question Title**: Concise and direct.
   - **Concrete Options**: 2 to 4 distinct options formatted as user choices.
   - **Recommendation**: Mark the technically optimal choice with `(Recommended)`.
   - **Multi-select**: Set `is_multi_select: true` when choices are not mutually exclusive.
3. Wait for the user's submission.

```json
{
  "questions": [
    {
      "question": "Where should the audio narration player appear in the reader view?",
      "options": [
        "(Recommended) Floating pill at the bottom center with play/pause and scrub controls",
        "Pinned to the top navigation header next to chapter controls",
        "Collapsible right-side drawer panel with full transcript highlighting"
      ],
      "is_multi_select": false
    }
  ]
}
```

---

### Step 3: Plan Synthesis (Co-Designed Blueprint)
1. After the user responds, synthesize their exact choices into a lean, agreed-upon blueprint:
   - **User Decisions**: Explicit list of options the user selected.
   - **File Impact**: Which specific files will be created or edited.
   - **Execution Steps**: Concrete technical implementation steps.
2. Present this concise summary and immediately proceed to coding.

---

### Step 4: Technical Execution & Verification
1. Implement the solution according to the user's specifications.
2. Preserve existing comments, formatting, and design system rules.
3. Validate syntax, links, and styling.
4. Update `.antigravity/context.md` and `.antigravity/state.json` to keep persistent memory fresh.
5. Report the completed results back to the user.
