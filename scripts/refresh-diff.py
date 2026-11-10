#!/usr/bin/env python3
"""
Diff live Red Bricks data against the snapshot in src/content/projects.

Project pages are point-in-time snapshots, taken when the page is written.
Prices, availability and sales status drift. This finds the drift so the
refresh is a short list of real changes rather than 100-odd manual reads.

Usage
-----
Paste the output of `search_projects` (one city at a time, sort by
newest_launch, limit 25) into a file, then:

    python3 scripts/refresh-diff.py live.txt

or pipe several cities at once:

    cat vaughan.txt markham.txt | python3 scripts/refresh-diff.py -

It reports three things:

  CHANGED   price or sales status moved. Re-read with get_project and edit.
  MISSING   a tracked project did not appear in the pasted results. Either
            it fell outside the 25-row cap for that city, or it was removed
            from Red Bricks. Check it directly with get_project.
  EXTRA     a live project at a tracked city that has no page here, filtered
            to freehold low-rise. Candidates to add.

A row where only the construction stage differs ("Under Construction /
Developer Selling" here vs "Developer Selling" live) is not drift: the
search endpoint returns the sales status only, so this compares the part
after the last "/".
"""

from __future__ import annotations

import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CONTENT = os.path.join(ROOT, 'src', 'content', 'projects')

# "#9030 Bridgelands | Vaughan | Builder | Type | Status | $711,496 – $1,724,990 | launched ..."
ROW = re.compile(
    r'^#(?P<id>\d+)\s+(?P<name>[^|]+?)\s*\|'
    r'(?P<mid>.*?)\|\s*(?P<price>TBA|\$[\d,]+(?:\s*[–-]\s*\$[\d,]+)?)\s*(?:\||$)'
)

# Types that are out of scope for this site: condo, stacked and life-lease
# product all carry a 10-day rescission right or a different tenure, and
# every project page here states there is no cooling-off period.
OUT_OF_SCOPE = ('condo', 'stacked', 'life lease', 'land lease')

# Statuses that make a live project a non-candidate: nothing left to register
# for, or nothing real to write about yet.
NOT_A_CANDIDATE = ('developer sold out', 'cancelled', 'on hold', 'planning phase')


def money(s: str) -> tuple[int | None, int | None]:
    if not s or s.strip() == 'TBA':
        return None, None
    nums = [int(n.replace(',', '')) for n in re.findall(r'\$([\d,]+)', s)]
    if not nums:
        return None, None
    return nums[0], (nums[1] if len(nums) > 1 else nums[0])


def sales_part(status: str) -> str:
    """The part after the last '/', lowercased. Drops the construction stage."""
    return status.split('/')[-1].strip().lower()


def load_snapshot() -> dict[str, dict]:
    out: dict[str, dict] = {}
    for path in sorted(glob.glob(os.path.join(CONTENT, '*.md'))):
        fm = open(path, encoding='utf-8').read().split('---', 2)[1]

        def g(key: str) -> str:
            m = re.search(rf'^{key}:\s*(.+)$', fm, re.M)
            return m.group(1).strip().strip('"') if m else ''

        rb = g('redBricksId')
        if not rb:
            continue
        pf, pt = g('priceFrom'), g('priceTo')
        out[rb] = {
            'rb': rb,
            'slug': os.path.basename(path)[:-3],
            'name': g('name'),
            'city': g('city'),
            'status': g('salesStatus'),
            'from': int(pf) if pf else None,
            'to': int(pt) if pt else None,
        }
    return out


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2

    text = sys.stdin.read() if sys.argv[1] == '-' else open(sys.argv[1], encoding='utf-8').read()
    snap = load_snapshot()

    live: dict[str, dict] = {}
    for line in text.splitlines():
        m = ROW.match(line.strip())
        if not m:
            continue
        parts = [p.strip() for p in line.strip().split('|')]
        # …| city | builder | type | status | price | launched
        status = parts[-3] if len(parts) >= 3 else ''
        lo, hi = money(m.group('price'))
        live[m.group('id')] = {
            'name': m.group('name').strip(),
            'status': status,
            'from': lo,
            'to': hi,
            'blob': line.lower(),
        }

    changed, missing, extra = [], [], []

    # Only report a tracked page as missing when its city actually appears in
    # the pasted rows. Otherwise pasting one city flags the other hundred.
    pasted_cities = {c for c in {s['city'].lower() for s in snap.values()}
                     if any(c in l['blob'] for l in live.values())}

    for rb, s in snap.items():
        l = live.get(rb)
        if l is None:
            if s['city'].lower() in pasted_cities:
                missing.append(s)
            continue
        notes = []
        if (s['from'], s['to']) != (l['from'], l['to']):
            def f(a, b):
                if a is None:
                    return 'TBA'
                return f'${a:,}' + (f'-${b:,}' if b and b != a else '')
            notes.append(f"price {f(s['from'], s['to'])} -> {f(l['from'], l['to'])}")
        if sales_part(s['status']) != sales_part(l['status']):
            notes.append(f"status {s['status']!r} -> {l['status']!r}")
        if notes:
            changed.append((s, notes))

    tracked_cities = {s['city'].lower() for s in snap.values()}
    for rb, l in live.items():
        if rb in snap:
            continue
        if any(t in l['blob'] for t in OUT_OF_SCOPE):
            continue
        if any(t in l['status'].lower() for t in NOT_A_CANDIDATE):
            continue
        if not any(c in l['blob'] for c in tracked_cities):
            continue
        extra.append((rb, l))

    print(f'Compared {len(snap)} tracked pages against {len(live)} live rows.\n')

    print(f'CHANGED ({len(changed)})')
    for s, notes in sorted(changed, key=lambda x: x[0]['slug']):
        print(f"  {s['slug']:34s} #{s['rb']}  {s['city']}")
        for n in notes:
            print(f'      {n}')
    if not changed:
        print('  none')

    print(f'\nMISSING from the pasted results, in pasted cities only ({len(missing)})')
    for s in sorted(missing, key=lambda x: x['slug']):
        print(f"  {s['slug']:34s} #{s['rb']}  {s['city']}")
    if not missing:
        print('  none')

    print(f'\nEXTRA live, freehold low-rise, no page here ({len(extra)})')
    for rb, l in sorted(extra, key=lambda x: x[1]['name'])[:40]:
        lo = f"${l['from']:,}" if l['from'] else 'TBA'
        print(f"  #{rb:6s} {l['name'][:44]:44s} {lo}")
    if not extra:
        print('  none')

    return 1 if changed else 0


if __name__ == '__main__':
    sys.exit(main())
