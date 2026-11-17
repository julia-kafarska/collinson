# T01 · Repo setup and hygiene

Day 1 · Size S (~30 min) · Depends on — · PRD §14, §17

**Goal:** A clean repo that is safe to make public later, with the process logs started.

## Decide first

- Whether the brief `.docx` goes into git (see Open decisions on the [board](README.md)).

## Done when

- [ ] Root `.gitignore` covers `node_modules/`, `dist/`, `coverage/`, `.env`, `.idea/`, and the `.docx` if it stays out.
- [ ] `docs/DECISIONS.md` started. First entries: TypeScript on Node 24, PostgreSQL on Light Cloud, Fastify under Yoga. Each entry gives the decision, the options considered and why this one won.
- [ ] `docs/AI-NOTES.md` started: which AI tools are used, and for what.
- [ ] First commit with `docs/` (PRD and tasks).
- [ ] Private GitHub repo created and pushed. It goes public in T21.

## Notes

- Check `git status` before the first push. Anything pushed to a public repo stays public, even after it is deleted.
