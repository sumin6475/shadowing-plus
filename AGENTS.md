<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:build-journal -->
# Build Journal (local only)

Record meaningful engineering progress in `docs/journal/` automatically. The
journal is ignored by Git and must stay local.

- After a verified implementation step, add a concise entry to `JOURNAL.md`.
- For a costly-to-reverse decision, create an ADR in `decisions/` once the user
  has made the decision.
- For a diagnosed and fixed failure, create a postmortem in `postmortems/` and
  link any regression coverage.
- For validation results, add a quality snapshot in `quality/`.

Keep entries factual and short; include real errors and test outcomes. Do not
invent decisions or journal routine, unverified edits. Add a one-line pointer
to every artifact from `JOURNAL.md`.
<!-- END:build-journal -->
