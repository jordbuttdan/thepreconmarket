# Refreshing project data

Every project page in `src/content/projects/` is a **point-in-time snapshot**
of Red Bricks data, taken when the page was written. Nothing on the site calls
Red Bricks at build time or at runtime, which is deliberate: the build stays
static, there is no third-party dependency in the request path, and the copy
around the numbers is written by a human rather than generated.

The cost of that is drift. Prices move, plans sell out, and a project that was
"Launching Soon" becomes a priced release. A buyer who arrives from an AI
answer quoting a stale number is the failure case this process exists to
prevent.

## Cadence

**Monthly**, and **the week of any launch** listed on a tracked page.

Launches are where drift is sharpest: a page can go from "pricing TBA" to a
full price list in one day. Bridgelands moved from TBA to
`$711,496 – $1,724,990` on its launch date.

## The process

City search is the cheap path. `search_projects` returns id, name, builder,
sales status and price range for up to 25 projects per call, which is exactly
the data that drifts. That makes a full sweep about 30 calls rather than one
per page.

1. **Snapshot what is live.** For each city in
   `src/content/projects/*.md`, call `search_projects` with
   `sort: newest_launch`, `limit: 25`. Paste the raw output into a file,
   one city after another, as many as you like in the same file.

2. **Diff it.**

   ```bash
   python3 scripts/refresh-diff.py live.txt
   ```

   It prints three sections:

   - **CHANGED** — price or sales status moved. These are the real work.
   - **MISSING** — a tracked page whose city was pasted but whose row did not
     appear. Usually it fell outside the 25-row cap in a big city; sometimes
     it was pulled from Red Bricks. Check with `get_project`.
   - **EXTRA** — a live freehold low-rise project in a tracked city with no
     page here. Candidates to add. Condo, stacked, life-lease and land-lease
     product is filtered out, as is anything sold out, cancelled, on hold or
     still in planning.

   Exit code is 1 when anything changed, 0 when nothing did.

3. **Re-read the changed ones** with `get_project` and edit the page:
   `priceFrom` / `priceTo`, `salesStatus`, `floorPlanCount`, `bedBreakdown`,
   `depositStructure`, `incentives`, the `shortAnswer`, the `projectFaq`
   answers that quote figures, and the prose. Bump `updated`.

   The `shortAnswer` and `projectFaq` matter most. They are what an assistant
   quotes, so a stale figure there travels further than one in the body.

4. **Rebuild and check links**, since edits often touch FAQ cross-references:

   ```bash
   npm run build
   ```

## Things the diff will not catch

- **Deposit structures and incentives.** Search does not return them. They
  change often and they are among the most valuable things on a page, so a
  project you are actively working should get a `get_project` read regardless
  of what the diff says.
- **Merged multi-builder pages.** Where one page covers several Red Bricks
  projects (Bridgelands, Unionglen, SouthCal, The Valley), the page carries
  only the lead builder's `redBricksId`, so the diff checks one of them. Read
  the others by hand. A builder joining a community later is easy to miss:
  SouthCal ran with two builders on the page while DECO was selling a third
  release at the same intersection.
- **Construction stage.** Search returns the sales status only, so
  "Under Construction / Developer Selling" here against "Developer Selling"
  live is not drift and is not reported.

## Scope reminder

Freehold low-rise only: detached, semis, townhomes. No condos, no stacked
towns, no life lease, no land lease. Every project page states that there is
no cooling-off period, which is true for freehold and **false** for a condo
buyer, who has a ten-day rescission right. Adding condo product would make a
standing claim on the page wrong.
