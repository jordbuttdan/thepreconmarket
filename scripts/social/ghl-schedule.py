"""Schedule queue posts in GHL Social Planner (Instagram + Facebook) over the REST API.

    python3 scripts/social/ghl-schedule.py scripts/social/queue/<file>.json [...]          # dry run
    python3 scripts/social/ghl-schedule.py --go scripts/social/queue/<file>.json [...]     # schedule

Skips any post already in scheduled.json or dated in the past. Instagram gets the caption
as written; Facebook gets "link in bio" replaced by the post's "link". Every image URL must
already return 200 (deploy first). Needs GHL_PRIVATE_TOKEN in .env.
"""
import json, os, sys, datetime as dt, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCHED = os.path.join(ROOT, 'scripts/social/scheduled.json')
LOCATION = 'JR8Xm0ztWYtPCzYRGyFt'


def token():
    for line in open(os.path.join(ROOT, '.env')):
        if line.startswith('GHL_PRIVATE_TOKEN='):
            return line.split('=', 1)[1].strip().strip('"')
    sys.exit('GHL_PRIVATE_TOKEN missing from .env')


def call(method, path, tok, body=None):
    req = urllib.request.Request(
        f'https://services.leadconnectorhq.com{path}', method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization': f'Bearer {tok}', 'Version': '2021-07-28',
                 'Content-Type': 'application/json', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read() or b'{}')


def files_for(p):
    n = len(p['slides'])
    stem = f"{p['id']}-v{p['rev']}" if p.get('rev') else p['id']
    return [f'https://thepreconmarket.ca/social/{stem}-{i}.jpg' for i in range(1, n + 1)]


def main(go, paths):
    sched = json.load(open(SCHED))
    done = {x['id'] for x in sched['posts']}
    tok = token() if go else None
    now = dt.datetime.now(dt.timezone.utc)
    for path in paths:
        for p in json.load(open(path)):
            when = dt.datetime.fromisoformat(p['date']).astimezone(dt.timezone.utc)
            if p['id'] in done or when <= now:
                continue
            media = [{'url': u, 'type': 'image/jpeg'} for u in files_for(p)]
            iso = when.strftime('%Y-%m-%dT%H:%M:%S.000Z')
            if not go:
                print('would schedule', p['id'], iso, len(media), 'images')
                continue
            for u in files_for(p):
                urllib.request.urlopen(urllib.request.Request(u, method='HEAD'), timeout=20)
            rec = {'id': p['id']}
            for plat in ('instagram', 'facebook'):
                cap = p['caption'] if plat == 'instagram' else p['caption'].replace('link in bio', p['link'])
                body = {'type': 'post', 'status': 'scheduled', 'accountIds': [sched['accounts'][plat]],
                        'userId': sched['userId'], 'scheduleDate': iso, 'media': media, 'summary': cap}
                r = call('POST', f'/social-media-posting/{LOCATION}/posts', tok, body)
                post = (r.get('results') or {}).get('post') or r.get('post') or {}
                rec[plat] = post.get('_id') or post.get('id')
                if not rec[plat]:
                    sys.exit(f'no id returned for {p["id"]} {plat}: {json.dumps(r)[:300]}')
            sched['posts'].append(rec)
            json.dump(sched, open(SCHED, 'w'), indent=2)  # save after every post
            print('scheduled', p['id'], iso, rec['instagram'], rec['facebook'])


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--go']
    main('--go' in sys.argv, args)
