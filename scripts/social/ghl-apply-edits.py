"""Apply scripts/social/pending-ghl-edits.json to GHL Social Planner over the REST API.

    python3 scripts/social/ghl-apply-edits.py          # dry run, prints what it would send
    python3 scripts/social/ghl-apply-edits.py --go     # sends the edits

Needs GHL_PRIVATE_TOKEN in .env (a GHL Private Integration token with Social Planner
read/write). .env is gitignored. Never put this token in a PUBLIC_ variable.
Edited items are removed from the pending file as they succeed.
"""
import json, os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PENDING = os.path.join(ROOT, 'scripts/social/pending-ghl-edits.json')
LOCATION = 'JR8Xm0ztWYtPCzYRGyFt'
USER = 'Y07NaCT5MNy7y4rUkbSu'


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


def main(go):
    data = json.load(open(PENDING))
    tok = token() if go else None
    left = []
    for e in data['edits']:
        body = {'type': 'post', 'status': 'scheduled', 'accountIds': [e['accountId']], 'userId': USER,
                'scheduleDate': e['scheduleDate'], 'media': e['media'], 'summary': e['summary']}
        if not go:
            print('would edit', e['post'], e['platform'], e['path_id'], len(e['media']), 'images')
            continue
        try:
            call('PUT', f"/social-media-posting/{LOCATION}/posts/{e['path_id']}", tok, body)
            post = call('GET', f"/social-media-posting/{LOCATION}/posts/{e['path_id']}", tok)['results']['post']
            ok = post['summary'] == e['summary'] and post['media'][0]['url'] == e['media'][0]['url'] and post['status'] == 'scheduled'
            print('ok ' if ok else 'MISMATCH', e['post'], e['platform'])
            if not ok:
                left.append(e)
        except Exception as ex:
            print('FAIL', e['post'], e['platform'], ex)
            left.append(e)
    if go:
        data['edits'] = left
        json.dump(data, open(PENDING, 'w'), ensure_ascii=False, indent=1)
        print(len(left), 'left')


if __name__ == '__main__':
    main('--go' in sys.argv)
