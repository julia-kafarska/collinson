# T20 · README and process docs

Day 5 · Size S (~2 h) · Depends on T15–T19 · PRD §3, §17

**Goal:** A reviewer understands what was built, how to run it and why it looks the way it does, without asking.

## Done when

- [ ] The README covers:
  - [ ] what the service is;
  - [ ] the live URL;
  - [ ] how to run it locally (`docker compose up -d`, `npm ci`, `npm run dev`);
  - [ ] an example query and the error codes;
  - [ ] the assumptions (PRD §3);
  - [ ] known limitations;
  - [ ] what I'd do next.
- [ ] Limitations are stated plainly:
  - [ ] valley elevation for ski towns;
  - [ ] heuristic thresholds;
  - [ ] in-memory limits for one instance;
  - [ ] no wind direction for surfing.
- [ ] `docs/DECISIONS.md` is tidied, not rewritten.
- [ ] `docs/AI-NOTES.md` says where AI helped, and where it was wrong and was overridden.
- [ ] Anything cut or unfinished gets one line on why. The brief asks for this.
