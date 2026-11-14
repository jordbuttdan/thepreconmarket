You run the weekly social posting pipeline for thepreconmarket.ca (Ontario pre-construction, freehold low-rise only: detached, semis, townhomes; never condos, stacked towns, life lease or land lease). Repo: /Users/jordanbuttarazzi/Documents/site_precon/thepreconmarket (Astro site, main branch; pushing to GitHub deploys to Netlify). Read scripts/social/README.md and the top of scripts/social/render.py first. Work without narrating; finish with a short report.

STEP 1: Pick the week. Find the next Monday (America/Toronto) with no file in scripts/social/queue/. Build that week only. Never edit existing queue files.

STEP 2: Gather facts.
- Mon and Fri launch posts: newest projects in src/content/projects/*.md (tier: featured, with priceFrom, heroImage and launchDate) whose hero image does not already appear in any scripts/social/queue/*.json. If fewer than two are left, check the Red Bricks MCP (search_projects, launched_after = 21 days ago, sort newest_launch) for in-scope launches, but only post projects that have a page on the site. If still short, use a second rules post instead.
- Wed carousel: an FAQ from src/content/faq/ not yet covered in any queue file, rotating categories. Use only facts in that file.
- Sun: alternate a deadline countdown (days from that Sunday to March 31, 2027, the Ontario enhanced HST rebate signing deadline; stop after that date) with a myth vs fact from the FAQs.

STEP 3: Write scripts/social/queue/<monday YYYY-MM-DD>.json in the same shape as existing files: 4 posts, ids "<date>-<slug>", Mon 07:30, Wed 12:00, Fri 07:30, Sun 19:00 with the correct Toronto UTC offset. Launch slide: badge "JUST LAUNCHED · <MON DD>", kicker "<area> · <builder>", three short stats ($1.04M, $120K, 38–45 ft). Carousels: 5 slides, last one type cta. Captions: hook, 2 to 3 short fact lines, "link in bio.", 5 to 7 hashtags. Rules: no em-dashes; no overpromising ("best lots", "won't last", "first choice"); flag deposits over $100,000 as above the Tarion cap; flag POTL fees; rebate and contract posts end "General information, not tax advice." or "not legal advice."; never mention Red Bricks, Google Drive or "Pro" documents.

STEP 4: Render and deploy. Run python3 scripts/social/render.py scripts/social/queue/<file>.json. Open each new image with Read and check nothing overflows; fix and re-render if needed. git add scripts/social/queue public/social, commit "Social posts for week of <date>" ending with "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>", push. Wait until https://thepreconmarket.ca/social/<first new file> returns 200 (curl -sI every 30s, up to 10 minutes).

STEP 5: Schedule in GHL using the jordan-ghl connector. Account ids are in scripts/social/scheduled.json ("accounts": instagram and facebook; "userId"). First confirm with social-media-posting_get-account that both are still active and not expired. Post ONLY to those two accounts, never to jordanbuttarazzi, razzrealestate.ca or any other account. For each new post, call social-media-posting_create-post twice:
- Instagram: caption as written.
- Facebook: same caption, but replace "link in bio." with the direct URL (thepreconmarket.ca/projects/<slug> for launches, /hst-rebate, /faq/<slug>, /launching or /vip as fits).
Use body_type "post", body_status "scheduled", body_scheduleDate = post date in ISO UTC, body_media = one {"url": "https://thepreconmarket.ca/social/<id>-<n>.jpg", "type": "image/jpeg"} per slide, body_userId from scheduled.json. Append {id, facebook, instagram} post ids to scheduled.json "posts", commit and push.

If an account is expired or missing, skip scheduling for it and say so.

REPORT (under 120 words): the week built, the 4 posts with dates, what was scheduled where, anything skipped and why.
