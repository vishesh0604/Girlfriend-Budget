# AI DEVELOPMENT INSTRUCTIONS

Before making changes:

1. Read PROJECT_SPEC.md.
2. Read CURRENT_STATE.md.
3. Treat PROJECT_SPEC.md as the product source of truth.
4. Treat CURRENT_STATE.md as the implementation source of truth.
5. Do not contradict either file without explicit instruction.

When implementing:

- Prefer simple solutions.
- Do not introduce unnecessary features.
- Do not hard-code user-specific budget values.
- Do not silently change existing business logic.
- Preserve historical financial data.
- Keep financial calculations centralized.
- Validate all monetary operations.
- Test transfer and carry-forward logic.
- Consider mobile UI for every feature.

When a requirement changes:

1. Explain the impact.
2. Update PROJECT_SPEC.md.
3. Update CURRENT_STATE.md.
4. Implement the change.

When completing a task:

Update CURRENT_STATE.md with:
- what was completed
- what files changed
- what remains
- known issues
- next recommended task
