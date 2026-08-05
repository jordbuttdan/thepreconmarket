# thepreconmarket.ca

A single-purpose marketing site for Ontario pre-construction buyers, built around one tool: the **New Home GST/HST Rebate Eligibility Checker**. Astro (static) + Tailwind, with one React island for the checker. Leads route to GoHighLevel; bookings come through the GHL calendar.

Owner: Jordan Buttarazzi, Broker | Valery Real Estate Inc., Brokerage | RECO #5009855

---

## Local development

```sh
npm install        # once
npm run dev        # dev server at http://localhost:4321
npm test           # rules-engine unit tests (vitest)
npm run build      # production build to dist/
npm run preview    # serve the production build locally
```

Requires Node 22+.

## Updating the rebate rules (non-developers welcome)

All rebate logic lives in **`src/lib/rebateRules.ts`**. You only ever need the
top section marked `EDITABLE CONSTANTS`:

1. Open `src/lib/rebateRules.ts` in any text editor.
2. Find the constant you need — each program has its own block with comments:
   - `FTHB_GST` — federal first-time buyer rebate (dates, $50,000 max, $1M/$1.5M price limits)
   - `ON_ENHANCED` — Ontario temporary enhanced rebate (window dates, $80,000 max)
   - `ON_STANDARD` — Ontario standard rebate ($24,000 max)
   - `FED_REGULAR` — regular federal rebate ($6,300 max, $350k/$450k phase-out)
   - `CONDO_COOLING_OFF_DAYS` — the 10-day condo rescission period
3. Change the number or date. Dates are `'YYYY-MM-DD'` in quotes; dollar
   amounts are plain numbers (underscores like `50_000` are just separators).
4. Update `LAST_UPDATED` at the top of the file to today's date — it is
   displayed on the site next to the tool.
5. Save, then run `npm test` (or ask a developer to). The tests check the
   boundary math still holds. Commit and push to `main` — Netlify redeploys
   automatically.

## GHL embed codes and environment variables

No GHL IDs are committed. The three URLs live in environment variables read
by `src/config/ghl.ts`:

| Variable | What it is | Where it appears |
| --- | --- | --- |
| `PUBLIC_GHL_LEAD_FORM_URL` | Inline form embed URL (first name, last name, email, phone-optional — 4 fields max) | Results gate on `/results` |
| `PUBLIC_GHL_CALENDAR_URL` | Calendar embed URL | `/book` |
| `PUBLIC_GHL_WEBHOOK_URL` | Inbound webhook that receives checker answers + estimates + `leadQuality` tag as JSON | Fired on gate submission |

- **Locally:** copy `.env.example` to `.env` and fill in the values.
- **Production:** Netlify dashboard → Site configuration → Environment
  variables. Add all three, then trigger a redeploy.

Until the URLs are set, the site renders labelled placeholder boxes where the
embeds go, so layout can be verified.

The results gate listens for the GHL form's `postMessage` on submission to
reveal the on-page breakdown (see `src/components/checker/Results.tsx`).
After pasting the real embed, submit a test lead and confirm the unlock fires;
adjust the event match there if GHL's payload differs.

**Lead quality tags** sent in the webhook payload (`leadQuality`) for GHL
workflow segmentation: `hot-cooling-off`, `hot-freehold-signed`,
`warm-shopping`, `needs-review`, `investor`, `likely-ineligible`. The booking
CTA also carries the tag as `?tag=` so `/book` shows matching copy.

## Analytics

GA4 and Meta Pixel have clearly commented placeholder slots in
`src/layouts/Base.astro` (`<head>`). Paste the snippets there; do not hardcode
IDs anywhere else.

## Deploying

Push to `main` on GitHub. Netlify builds with `npm run build` and publishes
`dist/` (see `netlify.toml`, Node 22). The canonical host is the **apex**
domain — `www` 301-redirects to `thepreconmarket.ca`, and Netlify forces
HTTPS automatically once the certificate is provisioned.

### DNS records for thepreconmarket.ca

At your DNS provider, point:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `@` (apex) | `75.2.60.5` (Netlify's load balancer) |
| `CNAME` | `www` | `<your-site-name>.netlify.app` |

Then in Netlify: Domain management → add `thepreconmarket.ca` as the primary
domain and `www.thepreconmarket.ca` as an alias. Netlify provisions the TLS
certificate automatically (allow up to an hour after DNS propagates).

If your DNS provider supports `ALIAS`/`ANAME` records at the apex, you can use
`<your-site-name>.netlify.app` instead of the A record — Netlify's docs prefer
it. Alternatively, delegate the whole domain to Netlify DNS.

## Project map

```
src/
  config/ghl.ts              GHL embed/webhook URLs (env-driven)
  lib/rebateRules.ts         ALL rebate logic + editable constants
  lib/rebateRules.test.ts    boundary-case tests
  lib/encodeAnswers.ts       shareable /results?d=… encoding (no personal data)
  components/checker/        Checker.tsx (question flow), Results.tsx (gate)
  layouts/Base.astro         head, header, footer + RECO compliance line
  pages/                     index, results, book, representation, about, privacy
```
