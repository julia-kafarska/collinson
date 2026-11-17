# Bruno collection

One request per scenario: Zermatt (ski town), Biarritz (surf town), Madrid (inland, so no
surfing), Paris with `countryCode: "US"` (Texas), an unknown place, an empty place, and four
aliases in one query. Each request checks the shape of the answer and the error codes, never which
activity wins, because the weather changes.

Two environments: `light-cloud` (the live service) and `local` (`http://localhost:8080`, the
default port of `npm run dev`).

## In the Bruno app

1. Install [Bruno](https://www.usebruno.com/downloads).
2. Choose **Open Collection** and pick this `bruno/` folder.
3. Choose an environment in the top-right corner.
4. Send one request, or run them all from the collection's **Run** menu.

## From the command line

From this folder, with nothing to install:

```sh
npx --yes @usebruno/cli@latest run --env light-cloud
npx --yes @usebruno/cli@latest run --env local
```

The run exits non-zero if any request, test or assertion fails, so it works as a smoke test.
