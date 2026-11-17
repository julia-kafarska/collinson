# T01 · Repo setup and hygiene

Day 1 · Size S (~30 min) · Depends on — · PRD §14, §17

**Goal:** A clean repo that is safe to make public later, with the process logs started.

## Decided

- The brief `.docx` stays out of git (docs/DECISIONS.md, D4).

## Done when

- [x] Root `.gitignore` covers `node_modules/`, `dist/`, `coverage/`, `.env`, `.idea/`, and the `.docx`.
- [x] `docs/DECISIONS.md` started. First entries: TypeScript on Node 24, PostgreSQL on Light Cloud, Fastify under Yoga. Each entry gives the decision, the options considered and why this one won.
- [x] `docs/AI-NOTES.md` started: which AI tools are used, and for what.
- [x] First commit with `docs/` (PRD and tasks).
- [x] Private GitHub repo pushed: `julia-kafarska/collinson`, which already existed. It goes public in T21.

## Notes

- Check `git status` before the first push. Anything pushed to a public repo stays public, even after it is deleted.
