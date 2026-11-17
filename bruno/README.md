# Bruno collection

One request per scenario: Zermatt (ski town), Biarritz (surf town), Madrid (inland, so no
surfing), Paris with `countryCode: "US"` (Texas), an unknown place, an empty place, and four
aliases in one query. Each request checks the shape of the answer and the error codes, never which
activity wins, because the weather changes.

`baseUrl` defaults to the live service, https://main-collinson-prod-team.light-cloud.io, set in
`collection.bru`. So the collection works without choosing an environment. The `local` environment
(`http://localhost:8080`, the default port of `npm run dev`) overrides it, and so does
`light-cloud`, which spells the live URL out.

## In the Bruno app

1. Install [Bruno](https://www.usebruno.com/downloads).
2. Choose **Open Collection** and pick this `bruno/` folder.
3. Optionally, choose `local` in the top-right corner to test your own server. With no environment selected, requests go to the live service.
4. Send one request, or run them all from the collection's **Run** menu.

## From the command line

From this folder, with nothing to install:

```sh
npx --yes @usebruno/cli@latest run              # the live service (collection default)
npx --yes @usebruno/cli@latest run --env local  # your local server
```

The run exits non-zero if any request, test or assertion fails, so it works as a smoke test.
