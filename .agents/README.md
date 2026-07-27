# .agents — Artifact Directory Convention

Every stage of the loop writes its output here as a markdown file. **Reading and approving these files is the human gate** — that's what makes the system Level 3 rather than autonomous. Commit them to git: they are the project's decision history and the agent's long-term memory.

| Folder | Written by | Read by |
| :--- | :--- | :--- |
| `PRDs/` | `/create-prd` | `/create-rules`, `/prime`, `/plan-feature` |
| `plans/` | `/plan-feature` | 🧑 approval, then `/execute` (its only context) |
| `code-reviews/` | `/code-review` (statuses updated by `/code-review-fix`) | 🧑 triage, then `/code-review-fix` |
| `deploys/` | `/deploy` | 🧑 record of production actions; source of rollback instructions |
| `execution-reports/` | `/execution-report` | `/system-review` |
| `system-reviews/` | `/system-review` | 🧑 approval, then: [PROJECT] proposals applied in place, [PACK] proposals applied upstream in Build System and re-copied |

Naming: kebab-case feature name, e.g. `plans/user-auth.md`, `code-reviews/user-auth.md` — same slug across folders so one feature's trail is greppable. Exception: `deploys/` prefixes the date (`deploys/2026-07-10-user-auth.md`), since deploys may bundle several features.
