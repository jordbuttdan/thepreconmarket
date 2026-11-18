# Social posting: Instagram + Facebook

Every post is built from site content, rendered here, hosted at
`https://thepreconmarket.ca/social/<file>.jpg`, and scheduled in GHL Social Planner
to the Precon Market Instagram and Facebook page together.

## Weekly cadence (7 feed posts, one a day)

| Day | Time (ET) | Pillar | Format |
| --- | --- | --- | --- |
| Mon | 7:30 am | **Launch** | Single image |
| Tue | 12:00 pm | **Rules explained**: rebate, deposit, contract or POTL | 5-slide carousel |
| Wed | 7:30 am | **Launch** | Single image |
| Thu | 12:00 pm | **Myth vs fact** | Single image |
| Fri | 7:30 am | **Launch** | Single image |
| Sat | 12:00 pm | **Rules, single slide** | Single image |
| Sun | 7:00 pm | **Deadline countdown or myth** | Single image |

The daily launch watch adds a second post on a day when something new releases.

Plus, done by hand:
- **1 Reel a week** of Jordan on camera, 20 to 30 seconds, using Wednesday's topic as the script.
- **Stories**: share each feed post the day it goes up, with a link sticker to the project page or `/vip`.

## Rules for every post

- Facts come from the project page or FAQ on the site, never from memory.
- Freehold low-rise only. No condos, stacked towns, life lease or land lease.
- No overpromising ("best lots", "won't last", guaranteed savings).
- Rebate and contract posts say "General information, not tax/legal advice".
- The renderer puts "Valery Real Estate Inc., Brokerage" small on every image. RECO requires
  the brokerage name on all advertising. Never add Jordan's name to images.
- No em-dashes.

## Post style (Nov 2026)

**Launch slide** (`type: launch`, no badge): `area` with the pin, e.g. "Holland Landing, East
Gwillimbury" (neighbourhood, then city or region); `product`, e.g. "Two-storey detached homes";
`name`, short enough for one line; `builder`, e.g. "Andrin Homes"; three `stats`
(`["From","$1.04M"]`). Don't repeat the product line in the stats.

**Launch caption:**

```
📍 <area>
🏗️ <builder> · <project>

<home type> just released 👇        (launched in the last 14 days; otherwise "now selling 👇")

🏡 <lots / sizes>
💰 From $<full price>
🔐 <deposit, with Tarion coverage worked out from the price>
🧾 <rebate or POTL fee note>
🚗 <location note, optional>

📲 Price list and floor plans: link in bio

#<area> #<region> #newhomes #preconstruction ... (5 to 7)
```

**Rules, myth and countdown captions:** a one-line hook ending in one emoji, a blank line,
3 or 4 emoji bullets, a blank line, `👉 Swipe for ...` (carousels only), `📲 <what>: link in bio`,
then the disclaimer line and hashtags. One emoji per line, nothing loud.

Each post in a queue file has a `link` (the full https URL). Facebook gets the same caption
with "link in bio" replaced by that URL. A re-rendered post gets `"rev": n`, which makes the
files `<id>-v<n>-<slide>.jpg` so GHL never serves a cached old image.

## Making a week

1. Write `scripts/social/queue/<monday-date>.json` (copy the last one).
2. `python3 scripts/social/render.py scripts/social/queue/<monday-date>.json`
3. Commit and push. Netlify publishes the images under `/social/`.
4. `python3 scripts/social/ghl-schedule.py --go scripts/social/queue/<file>.json` schedules each
   post on Instagram and Facebook and records the ids in `scheduled.json`.

Slide types and the `*highlight*` syntax are documented at the top of `render.py`.
Fonts in `fonts/` are converted from the site's own Inter and JetBrains Mono.
