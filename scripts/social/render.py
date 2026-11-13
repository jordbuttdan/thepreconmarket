"""Render Instagram/Facebook post images for thepreconmarket.ca.

    python3 scripts/social/render.py scripts/social/queue/2026-11-16.json

Reads a queue file of posts and writes 1080x1350 JPEGs to public/social/,
which Netlify serves at https://thepreconmarket.ca/social/<file>. GHL's
Social Planner pulls media from those public URLs.

Slide types:
  launch  – project render on top, name, three stats, footer
  text    – ink card: label, headline (wrap *words* in asterisks for honey), body
  number  – ink card with one giant honey figure
  cta     – closing slide pointing to the site
"""
import json, os, re, sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONTS = os.path.join(ROOT, 'scripts/social/fonts')
OUT = os.path.join(ROOT, 'public/social')
W, H = 1080, 1350
PAD = 72

INK = (20, 22, 26)
PAPER = (255, 254, 251)
HONEY = (245, 182, 12)
LABEL = (122, 110, 85)
RULE = (232, 224, 206)
SOFT = (200, 200, 196)

BROKER_LINE = 'Jordan Buttarazzi, Broker · Valery Real Estate Inc., Brokerage'


def inter(size, weight=400):
    f = ImageFont.truetype(os.path.join(FONTS, 'Inter.ttf'), size)
    f.set_variation_by_axes([weight])
    return f


def mono(size):
    return ImageFont.truetype(os.path.join(FONTS, 'JetBrainsMono-Medium.ttf'), size)


def tokens(text):
    """Split 'a *b c* d' into [(word, highlighted)]."""
    out, hl = [], False
    for raw in text.split(' '):
        w = raw
        start = w.startswith('*')
        if start:
            hl, w = True, w[1:]
        m = re.match(r'^(.*)\*([.,!?:;)]*)$', w)
        end = bool(m)
        if end:
            w = m.group(1) + m.group(2)
        out.append((w, hl))
        if end:
            hl = False
    return out


def draw_rich(d, xy, text, font, width, color, hl_color=HONEY, leading=1.12):
    """Word-wrap with *highlight* support. Returns the y below the block."""
    x0, y = xy
    space = d.textlength(' ', font=font)
    line, lw = [], 0
    lines = []
    for w, hl in tokens(text):
        tw = d.textlength(w, font=font)
        if line and lw + space + tw > width:
            lines.append(line)
            line, lw = [], 0
        line.append((w, hl, tw))
        lw += (space if len(line) > 1 else 0) + tw
    if line:
        lines.append(line)
    lh = int(font.size * leading)
    for ln in lines:
        x = x0
        for w, hl, tw in ln:
            d.text((x, y), w, font=font, fill=hl_color if hl else color)
            x += tw + space
        y += lh
    return y


def wordmark(d, x, y, dark_bg):
    base = PAPER if dark_bg else INK
    parts = [('The', 400, base), ('Precon', 700, base), ('Market', 400, base), ('.ca', 600, HONEY)]
    for t, wt, c in parts:
        f = inter(34, wt)
        d.text((x, y), t, font=f, fill=c)
        x += d.textlength(t, font=f)


def footer(d, dark_bg, right_text='THEPRECONMARKET.CA', page=None):
    y = H - 150
    d.line([(PAD, y), (W - PAD, y)], fill=(60, 62, 66) if dark_bg else RULE, width=2)
    wordmark(d, PAD, y + 30, dark_bg)
    rt = f'{page}  ·  {right_text}' if page else right_text
    f = mono(22)
    d.text((W - PAD - d.textlength(rt, font=f), y + 40), rt, font=f, fill=HONEY if dark_bg else LABEL)
    f2 = inter(19, 400)
    d.text((PAD, y + 88), BROKER_LINE, font=f2, fill=(150, 150, 146) if dark_bg else LABEL)


def slide_launch(s, page):
    im = Image.new('RGB', (W, H), PAPER)
    hero = Image.open(os.path.join(ROOT, s['image'])).convert('RGB')
    hero = ImageOps.fit(hero, (W, 760), Image.LANCZOS, centering=tuple(s.get('focus', (0.5, 0.5))))
    im.paste(hero, (0, 0))
    d = ImageDraw.Draw(im)
    # badge
    f = mono(24)
    badge = s.get('badge', 'JUST LAUNCHED')
    bw = d.textlength(badge, font=f)
    d.rectangle([PAD - 20, 56, PAD + bw + 20, 56 + 52], fill=HONEY)
    d.text((PAD, 68), badge, font=f, fill=INK)
    # body
    y = 808
    d.text((PAD, y), s['kicker'].upper(), font=mono(22), fill=LABEL)
    y = draw_rich(d, (PAD, y + 40), s['name'], inter(74, 700), W - 2 * PAD, INK, leading=1.05)
    # stats
    y = max(y + 22, 1010)
    col = (W - 2 * PAD) / len(s['stats'])
    for i, (label, value) in enumerate(s['stats']):
        x = PAD + i * col
        if i:
            d.line([(x - 18, y + 4), (x - 18, y + 92)], fill=RULE, width=2)
        d.text((x, y), label.upper(), font=mono(20), fill=LABEL)
        d.text((x, y + 34), value, font=inter(50, 650), fill=INK)
    footer(d, False, s.get('cta', 'PRICE LIST AT THEPRECONMARKET.CA'), page)
    return im


def slide_text(s, page):
    im = Image.new('RGB', (W, H), INK)
    d = ImageDraw.Draw(im)
    d.rectangle([PAD, PAD + 6, PAD + 14, PAD + 20], fill=HONEY)
    d.text((PAD + 30, PAD), s.get('label', '').upper(), font=mono(24), fill=HONEY)
    size = s.get('size', 84)
    y = draw_rich(d, (PAD, 230), s['headline'], inter(size, 700), W - 2 * PAD, PAPER, leading=1.08)
    if s.get('body'):
        draw_rich(d, (PAD, y + 48), s['body'], inter(38, 400), W - 2 * PAD, SOFT, leading=1.4)
    footer(d, True, s.get('cta', 'THEPRECONMARKET.CA'), page)
    return im


def slide_number(s, page):
    im = Image.new('RGB', (W, H), INK)
    d = ImageDraw.Draw(im)
    d.rectangle([PAD, PAD + 6, PAD + 14, PAD + 20], fill=HONEY)
    d.text((PAD + 30, PAD), s.get('label', '').upper(), font=mono(24), fill=HONEY)
    fs = s.get('size', 250)
    f = inter(fs, 750)
    while d.textlength(s['figure'], font=f) > W - 2 * PAD:
        fs -= 10
        f = inter(fs, 750)
    d.text((PAD - 6, 300), s['figure'], font=f, fill=HONEY)
    y = draw_rich(d, (PAD, 300 + int(fs * 1.15)), s['headline'], inter(60, 700), W - 2 * PAD, PAPER, leading=1.12)
    if s.get('body'):
        draw_rich(d, (PAD, y + 36), s['body'], inter(36, 400), W - 2 * PAD, SOFT, leading=1.4)
    footer(d, True, s.get('cta', 'THEPRECONMARKET.CA'), page)
    return im


def slide_cta(s, page):
    im = Image.new('RGB', (W, H), HONEY)
    d = ImageDraw.Draw(im)
    y = draw_rich(d, (PAD, 300), s['headline'], inter(92, 750), W - 2 * PAD, INK, hl_color=PAPER, leading=1.05)
    if s.get('body'):
        y = draw_rich(d, (PAD, y + 40), s['body'], inter(40, 450), W - 2 * PAD, INK, leading=1.35)
    f = inter(36, 650)
    label = s.get('button', 'thepreconmarket.ca')
    bw = d.textlength(label, font=f)
    d.rectangle([PAD, y + 60, PAD + bw + 80, y + 60 + 96], fill=INK)
    d.text((PAD + 40, y + 60 + 26), label, font=f, fill=PAPER)
    d.text((PAD, H - 62 - 19), BROKER_LINE, font=inter(19, 450), fill=INK)
    return im


RENDER = {'launch': slide_launch, 'text': slide_text, 'number': slide_number, 'cta': slide_cta}


def main(path):
    posts = json.load(open(path))
    os.makedirs(OUT, exist_ok=True)
    for p in posts:
        n = len(p['slides'])
        files = []
        for i, s in enumerate(p['slides'], 1):
            page = f'{i}/{n}' if n > 1 else None
            im = RENDER[s['type']](s, page)
            name = f"{p['id']}-{i}.jpg"
            im.save(os.path.join(OUT, name), 'JPEG', quality=90, optimize=True, progressive=True)
            files.append(name)
        print(p['id'], files)


if __name__ == '__main__':
    main(sys.argv[1])
