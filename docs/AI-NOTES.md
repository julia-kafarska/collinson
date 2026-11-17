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
