#!/usr/bin/env python3
"""
SEO BUILD HELPER
----------------------------------------------------
Run this after you add, remove or rename artworks in data/works.js:

    python tools/seo_build.py

It regenerates, from data/works.js:
  1. thumbs/<image-name>.webp   small gallery thumbnails (needs Pillow: pip install pillow)
  2. sitemap.xml                page + image + video sitemap for Google Search Console
  3. index.html                 the static gallery cards and the ImageGallery JSON-LD
                                between the SEO:...:START / SEO:...:END markers

YouTube videos: a work with a "youtube" field (link or video ID) is a video.
Its "file" is optional and only used as the poster image; without it the
YouTube thumbnail is used.

Projects: a work with "project" (url slug) and "items" (2+ images/videos,
each { "file": ... } or { "youtube": ... }, optional "name") is one gallery
card; its first item is the cover. Every item gets a thumbnail and goes into
the sitemap and structured data.

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
PROJECT_BADGE = ('<span class="project-badge"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" '
                 'viewBox="0 0 24 24"><rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 012 2v12"/></svg> '
                 'Project &middot; {count}</span>')
VIDEO_PLAY_ICON = ('<span class="video-play-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" '
                   'fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></span>')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_works():
    with open(os.path.join(ROOT, "data", "works.js"), encoding="utf-8") as f:
        src = f.read()
    start = src.index("[", src.index("PORTFOLIO_WORKS ="))  # skip brackets in the header comment
    body = src[start:src.rindex("]") + 1]
    body = re.sub(r",\s*([\]}])", r"\1", body)  # allow trailing commas
    return json.loads(body)


def dcc_list(item):
    dcc = item.get("dcc") or []
    return dcc if isinstance(dcc, list) else [dcc]


def youtube_id(item):
    value = str(item.get("youtube") or "").strip()
    if re.fullmatch(r"[\w-]{11}", value):
        return value
    m = re.search(r"(?:youtu\.be/|[?&]v=|/(?:embed|shorts|live|v)/)([\w-]{11})", value)
    return m.group(1) if m else ""


def youtube_thumb(vid):
    return f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"


def is_project(item):
    return bool(item.get("project")) and isinstance(item.get("items"), list) and len(item["items"]) > 0


def cover(item):
    return item["items"][0] if is_project(item) else item


def media(works):
    """Every single image/video: plain works as they are, project items merged with the project's metadata."""
    out = []
    for w in works:
        if not is_project(w):
            out.append(w)
            continue
        meta = {k: v for k, v in w.items() if k not in ("project", "items", "file", "youtube")}
        for it in w["items"]:
            out.append({**meta, **it, "name": it.get("name") or w.get("name"),
                        "description": it.get("description") or w.get("description")})
    return out


def card_image(item):
    """Relative thumbnail for images and video posters, YouTube's own thumbnail otherwise."""
    item = cover(item)
    if item.get("file"):
        return thumb_path(item["file"])
    return youtube_thumb(youtube_id(item))


def thumb_path(file):
    stem = os.path.splitext(os.path.basename(file))[0]
    return f"thumbs/{stem}.webp"


def alt_text(item):
    tools = " & ".join(dcc_list(item))
    rnd = item.get("renderer") or ""
    kind = "video" if youtube_id(item) else "render"
    parts = [item.get("name") or "Untitled render", f"{item.get('category') or '3D'} {kind}"]
    tech = ", ".join(p for p in [tools, rnd] if p)
    return " - ".join(parts) + (f" made in {tech}" if tech else "")


def keywords(w):
    return ", ".join(dcc_list(w) + [w.get("renderer") or ""]).strip(", ")


def build_thumbs(works):
    try:
        from PIL import Image
    except ImportError:
        print("! Pillow not installed, skipping thumbnails (pip install pillow)")
        return
    os.makedirs(os.path.join(ROOT, "thumbs"), exist_ok=True)
    for item in media(works):
        if not item.get("file"):
            continue  # video without a poster image: YouTube's thumbnail is used
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


def abs_url(path):
    return path if path.startswith("http") else SITE_URL + path


def build_sitemap(works):
    e = html.escape
    entries = []
    images = videos = 0
    for w in media(works):
        vid = youtube_id(w)
        if vid:
            entries.append(
                "    <video:video>"
                f"<video:thumbnail_loc>{e(abs_url(card_image(w)))}</video:thumbnail_loc>"
                f"<video:title>{e(w.get('name') or 'Untitled video')}</video:title>"
                f"<video:description>{e(w.get('description') or w.get('name') or 'Video')}</video:description>"
                f"<video:player_loc>https://www.youtube.com/embed/{vid}</video:player_loc>"
                "</video:video>"
            )
            videos += 1
        elif w.get("file"):
            entries.append(f"    <image:image><image:loc>{e(SITE_URL + w['file'])}</image:loc></image:image>")
            images += 1
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
        + ('\n        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"' if videos else "")
        + ">\n"
        "  <url>\n"
        f"    <loc>{SITE_URL}</loc>\n"
        + "\n".join(entries) + "\n"
        "  </url>\n"
        "</urlset>\n"
    )
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as f:
        f.write(xml)
    print(f"  sitemap.xml ({images} images" + (f", {videos} videos)" if videos else ")"))


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
        vid = youtube_id(cover(w))
        href = f"https://www.youtube.com/watch?v={vid}" if vid else cover(w)["file"]
        play = VIDEO_PLAY_ICON if vid else ""
        project = PROJECT_BADGE.format(count=len(w["items"])) if is_project(w) else ""
        cards.append(
            f'      <article class="art-card{" is-project" if project else ""}">'
            f'<a class="art-media-wrap has-loaded" href="{e(href)}">'
            f'<img class="art-img" src="{e(card_image(w))}" alt="{e(alt_text(w))}" {loading} decoding="async">{play}{project}</a>'
            f'<div class="art-details"><div class="art-header"><h3 class="art-title">{e(w.get("name") or "")}</h3>{year}</div>'
            f'<div class="art-meta-row"><span class="art-category">{e(w.get("category") or "")}</span>'
            f'<div class="art-badges-inline">{badges}</div></div>'
            f'<p class="visually-hidden">{e(w.get("description") or "")}</p></div></article>'
        )
    return "\n".join(cards)


def video_object(w):
    vid = youtube_id(w)
    obj = {
        "@type": "VideoObject",
        "name": w.get("name") or "",
        "description": w.get("description") or w.get("name") or "",
        "thumbnailUrl": abs_url(card_image(w)),
        "embedUrl": f"https://www.youtube.com/embed/{vid}",
        "url": f"https://www.youtube.com/watch?v={vid}",
    }
    if w.get("uploadDate"):  # optional "YYYY-MM-DD", needed by Google for video rich results
        obj["uploadDate"] = w["uploadDate"]
    obj.update({
        "dateCreated": str(w.get("year") or ""),
        "genre": w.get("category") or "",
        "keywords": keywords(w),
        "creator": {"@type": "Person", "name": AUTHOR},
    })
    return obj


def gallery_jsonld(works):
    works = media(works)
    videos = [video_object(w) for w in works if youtube_id(w)]
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
                "keywords": keywords(w),
                "creator": {"@type": "Person", "name": AUTHOR},
                "creditText": AUTHOR,
                "copyrightNotice": AUTHOR,
            }
            for w in works
            if not youtube_id(w)
        ],
    }
    if videos:
        data["video"] = videos
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
