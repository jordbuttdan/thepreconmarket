"""Render Instagram/Facebook post images for thepreconmarket.ca.

    python3 scripts/social/render.py scripts/social/queue/2026-11-16.json

Reads a queue file of posts and writes 1080x1350 JPEGs to public/social/,
which Netlify serves at https://thepreconmarket.ca/social/<file>. GHL's
Social Planner pulls media from those public URLs.

Slide types:
  launch  – project render on top; area (pin), product, name, builder (hard hat),
            three stats, footer. Fields: image (optional; without it, give price and note), area, product, name, builder, stats
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
FOOT = 160  # footer height from the bottom edge

INK = (20, 22, 26)
PAPER = (255, 254, 251)
HONEY = (245, 182, 12)
LABEL = (122, 110, 85)
RULE = (232, 224, 206)
SOFT = (200, 200, 196)

BROKERAGE = 'Valery Real Estate Inc., Brokerage'


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


def wordmark(d, x, y, dark_bg, size=34):
    base = PAPER if dark_bg else INK
    parts = [('The', 400, base), ('Precon', 700, base), ('Market', 400, base), ('.ca', 600, HONEY)]
    for t, wt, c in parts:
        f = inter(size, wt)
        d.text((x, y), t, font=f, fill=c)
        x += d.textlength(t, font=f)
    return x


def wordmark_width(d, size=34):
    return sum(d.textlength(t, font=inter(size, wt)) for t, wt in
               [('The', 400), ('Precon', 700), ('Market', 400), ('.ca', 600)])


def footer(im, d, dark_bg, page=None):
    """Rule, then 'More info at <logo>' centred, brokerage line small and quiet."""
    y = H - FOOT
    d.line([(PAD, y), (W - PAD, y)], fill=(60, 62, 66) if dark_bg else RULE, width=2)
    lead = 'More info at '
    f = inter(32, 450)
    lw = d.textlength(lead, font=f)
    x = (W - (lw + wordmark_width(d, 40))) / 2
    d.text((x, y + 44), lead, font=f, fill=SOFT if dark_bg else LABEL)
    wordmark(d, x + lw, y + 40, dark_bg, size=40)
    f2 = inter(16, 400)
    quiet = (110, 110, 106) if dark_bg else (170, 162, 145)
    d.text(((W - d.textlength(BROKERAGE, font=f2)) / 2, H - 40), BROKERAGE, font=f2, fill=quiet)
    if page:
        fp = mono(22)
        d.text((W - PAD - d.textlength(page, font=fp), PAD), page, font=fp, fill=HONEY if dark_bg else LABEL)


def pin_icon(d, x, y, s, color):
    """Map pin: circle head with a point, hollow centre. (x, y) is the top-left, s the height."""
    r = s * 0.36
    cx, cy = x + r, y + r
    d.polygon([(cx - r * 0.82, cy + r * 0.45), (cx + r * 0.82, cy + r * 0.45), (cx, y + s)], fill=color)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    d.ellipse([cx - r * 0.42, cy - r * 0.42, cx + r * 0.42, cy + r * 0.42], fill=PAPER)
    return x + 2 * r


def hat_icon(d, x, y, s, color):
    """Hard hat for the builder line."""
    w = s * 1.15
    d.pieslice([x + w * 0.12, y + s * 0.12, x + w * 0.88, y + s * 1.08], 180, 360, fill=color)
    d.rectangle([x, y + s * 0.6, x + w, y + s * 0.74], fill=color)
    d.rectangle([x + w * 0.45, y + s * 0.08, x + w * 0.55, y + s * 0.5], fill=PAPER)
    return x + w


def slide_launch(s, page):
    """Area first (pin), then home type, project name, builder (hard hat), stats."""
    im = Image.new('RGB', (W, H), PAPER)
    HERO_H = 700
    d = ImageDraw.Draw(im)
    if s.get('image'):
        hero = Image.open(os.path.join(ROOT, s['image'])).convert('RGB')
        hero = ImageOps.fit(hero, (W, HERO_H), Image.LANCZOS, centering=tuple(s.get('focus', (0.5, 0.5))))
        im.paste(hero, (0, 0))
    else:
        # No clean rendering yet: an ink panel led by the starting price.
        d.rectangle([0, 0, W, HERO_H], fill=INK)
        d.text((PAD, 250), 'FROM', font=mono(30), fill=HONEY)
        f = inter(150, 750)
        d.text((PAD - 6, 300), s['price'], font=f, fill=HONEY)
        d.text((PAD, 500), s.get('note', 'Renderings to come'), font=inter(36, 400), fill=SOFT)
    # area
    y = HERO_H + 40
    x = pin_icon(d, PAD, y + 2, 40, HONEY)
    d.text((x + 16, y), s['area'], font=inter(36, 650), fill=INK)
    # home type
    y += 66
    d.text((PAD, y), s['product'].upper(), font=mono(22), fill=LABEL)
    # project name, shrunk to one line
    y += 62
    fs = 74
    while d.textlength(s['name'], font=inter(fs, 700)) > W - 2 * PAD and fs > 52:
        fs -= 4
    d.text((PAD - 3, y), s['name'], font=inter(fs, 700), fill=INK)
    # builder
    y += int(fs * 1.12) + 22
    x = hat_icon(d, PAD, y + 4, 30, HONEY)
    fb = inter(30, 450)
    d.text((x + 14, y), 'by ', font=fb, fill=LABEL)
    d.text((x + 14 + d.textlength('by ', font=fb), y), s['builder'], font=inter(30, 650), fill=INK)
    # stats
    # stats centred in the space between the builder line and the footer rule
    y = int((y + 40 + H - FOOT) / 2 - 44)
    col = (W - 2 * PAD) / len(s['stats'])
    for i, (label, value) in enumerate(s['stats']):
        sx = PAD + i * col
        if i:
            d.line([(sx - 18, y + 4), (sx - 18, y + 84)], fill=RULE, width=2)
        d.text((sx, y), label.upper(), font=mono(20), fill=LABEL)
        d.text((sx, y + 32), value, font=inter(46, 650), fill=INK)
    footer(im, d, False, page)
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
    footer(im, d, True, page)
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
    footer(im, d, True, page)
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
    ww = wordmark_width(d, 44)
    tw, th = ww + 72, 96
    tx, ty = int((W - tw) / 2), H - 110 - th
    d.rounded_rectangle([tx, ty, tx + tw, ty + th], radius=14, fill=PAPER)
    wordmark(d, tx + 36, ty + 22, False, size=44)
    f2 = inter(16, 400)
    d.text(((W - d.textlength(BROKERAGE, font=f2)) / 2, H - 40), BROKERAGE, font=f2, fill=(120, 92, 20))
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
            # 'rev' gives re-rendered posts new file names, so nothing serves a cached old image
            name = f"{p['id']}-v{p['rev']}-{i}.jpg" if p.get('rev') else f"{p['id']}-{i}.jpg"
            im.save(os.path.join(OUT, name), 'JPEG', quality=90, optimize=True, progressive=True)
            files.append(name)
        print(p['id'], files)


if __name__ == '__main__':
    main(sys.argv[1])
