# Social posting: Instagram + Facebook

Every post is built from site content, rendered here, hosted at
`https://thepreconmarket.ca/social/<file>.jpg`, and scheduled in GHL Social Planner
to the Precon Market Instagram and Facebook page together.

## Weekly cadence (4 feed posts)

| Day | Time (ET) | Pillar | Format |
| --- | --- | --- | --- |
| Mon | 7:30 am | **Launch watch**: newest launch on the site | Single image |
| Wed | 12:00 pm | **Rules explained**: rebate, deposit, contract or POTL | 5-slide carousel |
| Fri | 7:30 am | **Launch watch #2**: second launch, or a price/deposit update | Single image |
| Sun | 7:00 pm | **Deadline or myth vs fact** | Single image |

Plus, done by hand:
- **1 Reel a week** of Jordan on camera, 20 to 30 seconds, using Wednesday's topic as the script.
- **Stories**: share each feed post the day it goes up, with a link sticker to the project page or `/vip`.

## Rules for every post

- Facts come from the project page or FAQ on the site, never from memory.
- Freehold low-rise only. No condos, stacked towns, life lease or land lease.
- No overpromising ("best lots", "won't last", guaranteed savings).
- Rebate and contract posts say "General information, not tax/legal advice".
- The broker line (name, Broker, brokerage) is on every image. RECO requires it.
- No em-dashes. Captions: hook, 3 facts, "link in bio", 5 to 7 hashtags.

## Making a week

1. Write `scripts/social/queue/<monday-date>.json` (copy the last one).
2. `python3 scripts/social/render.py scripts/social/queue/<monday-date>.json`
3. Commit and push. Netlify publishes the images under `/social/`.
4. Create each post in GHL (Instagram + Facebook accounts), scheduled for its `date`,
   with media `https://thepreconmarket.ca/social/<id>-<n>.jpg`.

Slide types and the `*highlight*` syntax are documented at the top of `render.py`.
Fonts in `fonts/` are converted from the site's own Inter and JetBrains Mono.
