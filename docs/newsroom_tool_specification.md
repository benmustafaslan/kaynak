# Newsroom Tool – Design Specification

**Full project spec**: See [PROJECT_SPEC.md](./PROJECT_SPEC.md) for data models, workflows, fact-checking, UI/UX, phases, and implementation rules.

Key references:

- **Data model**: stories, script_versions, fact_checks, sources, series, users, workflows, activity_log
- **Auth**: JWT in httpOnly cookies, bcrypt, no sensitive data in logs
- **Principles**: Human-in-the-loop (no automated state changes), simplicity, cost-conscious, journalist-centric, quality gates
