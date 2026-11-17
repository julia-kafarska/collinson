# T20 · README and process docs

Day 5 · Size S (~2 h) · Depends on T15–T19 · PRD §3, §17

**Goal:** A reviewer understands what was built, how to run it and why it looks the way it does, without asking.

## Done when

- [x] The README covers:
  - [x] what the service is;
  - [x] the live URL;
  - [x] how to run it locally (`docker compose up -d`, `npm ci`, `npm run dev`);
  - [x] an example query and the error codes;
  - [x] the assumptions (PRD §3);
  - [x] known limitations;
  - [x] what I'd do next.
- [x] Limitations are stated plainly:
  - [x] valley elevation for ski towns;
  - [x] heuristic thresholds;
  - [x] in-memory limits for one instance;
  - [x] no wind direction for surfing.
- [x] `docs/DECISIONS.md` is tidied, not rewritten.
- [x] `docs/AI-NOTES.md` says where AI helped, and where it was wrong and was overridden.
- [x] Anything cut or unfinished gets one line on why. The brief asks for this.
