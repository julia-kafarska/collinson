# AI usage notes

The brief asks for AI to be used, and for the way of working to be visible. This is the running log.

## Tools

- Claude Code (Claude Opus 5.5) in the terminal: planning, review, API spikes and implementation.
- Parallel sub-agents (Claude Code's Agent tool) for tasks that don't depend on each other. Each one works on its own git branch, and I review and merge.

## How it was used

1. Drafted the PRD from the brief, then refined it in conversation: API documentation, Bruno over Postman, the clean-code and TDD section, storage, deployment and security.
2. Reviewed the PRD like a code review. The review ran the PRD's own day-1 spike against the live Open-Meteo API, and checked SQLite and Postgres behaviour, instead of trusting assumptions.
3. Split the PRD into 21 tasks (`docs/tasks/`).
4. Implementation: tests first, small commits, one task at a time, with independent tasks in parallel.

## Where AI was wrong, or was overridden

- The first PRD picked SQLite. I overrode it: the service is deployed to Light Cloud, so it uses Postgres (D2).
- The first PRD, written with AI, had design bugs that its own review then found with real API calls:
  - snow depth arrives in metres, not centimetres;
  - polar night has zero daylight, which would divide by zero;
  - a marine failure would overwrite good wave data;
  - a blizzard would rank as the best ski day;
  - the indoor formula would beat skiing in ski resorts.
- Lesson: assumptions about an external API are guesses until a real response has been checked.

## Working with parallel agents (2026-11-17)

- What worked: shared contracts first (`src/domain.ts`, `src/errors.ts`, `src/open-meteo/http.ts`, test helpers), then one agent per task with a strict list of files it may touch. Every merge was clean, because no two agents edited the same file.
- Agents reported real findings rather than just code:
  - geocoding sometimes has no timezone;
  - `0.29 * 100` isn't exactly 29;
  - snow depth rises on days without snowfall;
  - a big 5.4 m swell still scores 53 with the PRD weights.
  These went into the spike notes and the task files.
- What went wrong:
  - `npx prettier` picked up a global Prettier 2 through the shell wrapper and broke the lint. Agents switched to `./node_modules/.bin/prettier`.
  - One agent's worktree started from an older commit, so it had to fast-forward to `main` first.
  - The worktrees sit inside the repo folder, so ESLint scanned them until `.claude/` was ignored.

## Later lessons (2026-11-17)

- **Calibration on real weeks found what unit tests couldn't.** The T15 agent surveyed 51 live weeks and found that `indoor = 100 − outdoor` beat skiing at every snowy resort. Every scorer passed its own tests, so only the cross-activity check showed it (D16).
- **Tests caught library surprises early:**
  - Fastify 5.12 ignores a numeric `trustProxy`;
  - GraphQL Yoga masks an error whose cause isn't a GraphQLError;
  - in tests, vitest and Node loaded different builds of `graphql`.
- **My own mistake:** a `git revert` failed silently, and the `--amend` after it reworded the logging commit as "revert", so the history no longer matched the code. I rebuilt only the unpushed commits on top of a real revert, confirmed the final code was byte-for-byte the same, and pushed without forcing. Lesson: check each git step's result instead of chaining quiet commands.
- **CI was blocked by account billing, not by the code.** Every run failed in 4 s without starting. Making the repo public, which the brief requires anyway, made it pass on the first run.
