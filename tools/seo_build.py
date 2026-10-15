#!/usr/bin/env python3
"""
SEO BUILD HELPER
----------------------------------------------------
Run this after you add, remove or rename artworks in data/works.js:

    python tools/seo_build.py

It regenerates, from data/works.js:
  1. thumbs/<image-name>.webp   small gallery thumbnails (needs Pillow: pip install pillow)
  2. sitemap.xml                page + image sitemap for Google Search Console
  3. index.html                 the static gallery cards and the ImageGallery JSON-LD
                                between the SEO:...:START / SEO:...:END markers

Nothing else in index.html is touched. Safe to run as often as you like.
"""
import html
import json
import os
import re
import sys

SITE_URL = "https://codesome3d.github.io/3d-viz-prtf/"
AUTHOR = "Egor Baklykov"
THUMB_WIDTH = 800
THUMB_QUALITY = 80

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_works():
    with open(os.path.join(ROOT, "data", "works.js"), encoding="utf-8") as f:
        src = f.read()
    body = src[src.index("["):src.rindex("]") + 1]
    body = re.sub(r",\s*([\]}])", r"\1", body)  # allow trailing commas
    return json.loads(body)


def dcc_list(item):
    dcc = item.get("dcc") or []
    return dcc if isinstance(dcc, list) else [dcc]


def thumb_path(file):
    stem = os.path.splitext(os.path.basename(file))[0]
    return f"thumbs/{stem}.webp"


def alt_text(item):
    tools = " & ".join(dcc_list(item))
    rnd = item.get("renderer") or ""
    parts = [item.get("name") or "Untitled render", f"{item.get('category') or '3D'} render"]
    tech = ", ".join(p for p in [tools, rnd] if p)
    return " - ".join(parts) + (f" made in {tech}" if tech else "")


def build_thumbs(works):
    try:
        from PIL import Image
    except ImportError:
        print("! Pillow not installed, skipping thumbnails (pip install pillow)")
        return
    os.makedirs(os.path.join(ROOT, "thumbs"), exist_ok=True)
    for item in works:
        src = os.path.join(ROOT, item["file"])
        dst = os.path.join(ROOT, thumb_path(item["file"]))
        if not os.path.exists(src):
            print(f"! missing image: {item['file']}")
            continue
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        with Image.open(src) as im:
            im = im.convert("RGB")
            if im.width > THUMB_WIDTH:
                im = im.resize((THUMB_WIDTH, round(im.height * THUMB_WIDTH / im.width)), Image.LANCZOS)
            im.save(dst, "WEBP", quality=THUMB_QUALITY, method=6)
        print(f"  thumb {thumb_path(item['file'])}")


def build_sitemap(works):
    images = "\n".join(
        f"    <image:image><image:loc>{html.escape(SITE_URL + w['file'])}</image:loc></image:image>"
        for w in works
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
        "  <url>\n"
        f"    <loc>{SITE_URL}</loc>\n"
        f"{images}\n"
        "  </url>\n"
        "</urlset>\n"
    )
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as f:
        f.write(xml)
    print(f"  sitemap.xml ({len(works)} images)")


def static_cards(works):
    e = html.escape
    cards = []
    for i, w in enumerate(works):
        badges = "".join(f'<span class="badge-dcc" data-dcc="{e(d)}">{e(d)}</span>' for d in dcc_list(w))
        rnd = w.get("renderer") or ""
        if rnd:
            badges += f'<span class="badge-rnd" data-rnd="{e(rnd)}">{e(rnd)}</span>'
        loading = 'fetchpriority="high"' if i < 2 else ('' if i < 4 else 'loading="lazy"')
        year = f'<span class="art-year">{e(str(w.get("year") or ""))}</span>' if w.get("year") else ""
        cards.append(
            f'      <article class="art-card">'
            f'<a class="art-media-wrap has-loaded" href="{e(w["file"])}">'
            f'<img class="art-img" src="{e(thumb_path(w["file"]))}" alt="{e(alt_text(w))}" {loading} decoding="async"></a>'
            f'<div class="art-details"><div class="art-header"><h3 class="art-title">{e(w.get("name") or "")}</h3>{year}</div>'
            f'<div class="art-meta-row"><span class="art-category">{e(w.get("category") or "")}</span>'
            f'<div class="art-badges-inline">{badges}</div></div>'
            f'<p class="visually-hidden">{e(w.get("description") or "")}</p></div></article>'
        )
    return "\n".join(cards)


def gallery_jsonld(works):
    data = {
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        "name": f"{AUTHOR} - 3D Visualization Portfolio",
        "url": SITE_URL,
        "author": {"@id": SITE_URL + "#person"},
        "image": [
            {
                "@type": "ImageObject",
                "name": w.get("name") or "",
                "description": w.get("description") or "",
                "contentUrl": SITE_URL + w["file"],
                "thumbnailUrl": SITE_URL + thumb_path(w["file"]),
                "dateCreated": str(w.get("year") or ""),
                "genre": w.get("category") or "",
                "keywords": ", ".join(dcc_list(w) + [w.get("renderer") or ""]).strip(", "),
                "creator": {"@type": "Person", "name": AUTHOR},
                "creditText": AUTHOR,
                "copyrightNotice": AUTHOR,
            }
            for w in works
        ],
    }
    body = json.dumps(data, ensure_ascii=False, indent=2).replace("</", "<\\/")
    return '  <script type="application/ld+json">\n' + body + "\n  </script>"


def replace_block(text, name, content, nl):
    start, end = f"<!-- SEO:{name}:START -->", f"<!-- SEO:{name}:END -->"
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if not pattern.search(text):
        sys.exit(f"! marker {start} not found in index.html")
    block = start + nl + content.replace("\n", nl) + nl + "  " + end
    return pattern.sub(lambda _: block, text, count=1)


def build_index(works):
    path = os.path.join(ROOT, "index.html")
    with open(path, encoding="utf-8", newline="") as f:
        text = f.read()
    nl = "\r\n" if "\r\n" in text else "\n"
    text = replace_block(text, "STATIC-GALLERY", static_cards(works), nl)
    text = replace_block(text, "JSONLD-GALLERY", gallery_jsonld(works), nl)
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    print("  index.html static gallery + JSON-LD")


if __name__ == "__main__":
    works = load_works()
    print(f"{len(works)} works in data/works.js")
    build_thumbs(works)
    build_sitemap(works)
    build_index(works)
    print("Done.")
