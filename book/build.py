#!/usr/bin/env python3
"""
Build the Zichron Yonatan book for Amazon KDP from content/zichronyonatan/.

Outputs (in book/output/):
  Zichron-Yonatan-paperback-6x9.pdf   print interior, 6" x 9", no bleed
  Zichron-Yonatan.epub                Kindle ebook (upload to KDP as-is)
  Zichron-Yonatan.html                the combined manuscript, for proofreading

Requirements:  pip install weasyprint markdown pyyaml ebooklib
Usage:         python3 book/build.py
Edit book/front-matter.md for the title, dedication, introduction and ISBN.
"""
import datetime
import html
import re
import sys
from collections import defaultdict
from pathlib import Path

import markdown
import yaml

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "book"
CONTENT = ROOT / "content" / "zichronyonatan"
OUT = BOOK / "output"

MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]

PARTS = [
    ("Bereishit", "Sefer Bereishit", "The Book of Genesis"),
    ("Shemot", "Sefer Shemot", "The Book of Exodus"),
    ("Vayikra", "Sefer Vayikra", "The Book of Leviticus"),
    ("Bamidbar", "Sefer Bamidbar", "The Book of Numbers"),
    ("Devarim", "Sefer Devarim", "The Book of Deuteronomy"),
]

# Festivals are placed where they fall in the yearly reading cycle:
# slug -> (part, position in the cycle). Parshiot use their `order` field.
HOLIDAY_PLACEMENT = {
    "chanukah": ("Bereishit", 9.5),            # between Vayeishev and Miketz
    "tu-b-shvat-shovavim": ("Shemot", 16.5),   # after Beshalach
    "purim": ("Shemot", 21.5),                 # after Tetzaveh
    "pesach": ("Vayikra", 25.5),               # after Tzav
    "lag-ba-omer": ("Vayikra", 30.5),          # after Emor
    "shavuot": ("Bamidbar", 34.5),             # after Bamidbar
    "three-weeks-tisha-b-av": ("Devarim", 42.5),  # opens Devarim (Shabbat Chazon)
    "rosh-hashanah": ("Devarim", 50.5),        # after Nitzavim-Vayelech
    "yom-kippur": ("Devarim", 51.2),           # after Ha'azinu
    "sukkot": ("Devarim", 51.4),
    "shmini-atzeret-simchat-torah": ("Devarim", 51.6),
}
# Vezot HaBerakhah is read on Simchat Torah, so it closes the cycle.
ORDER_OVERRIDE = {"vezot-haberakhah": 51.8}


# ---------------------------------------------------------------- loading

def parse_date(raw):
    """Return (sort_key, display) for the free-text `date` field."""
    raw = (raw or "").strip()
    if not raw:
        return (9999, 0, 0), ""
    if "~" in raw or "created" in raw.lower():   # approximate sourcing notes
        y = re.search(r"(\d{4})", raw)
        return ((int(y.group(1)), 0, 0), y.group(1)) if y else ((9999, 0, 0), "")
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", raw)
    if m:
        y, mo, d = map(int, m.groups())
        return (y, mo, d), f"{MONTHS[mo - 1]} {d}, {y}"
    m = re.fullmatch(r"([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})", raw)
    if m and m.group(1) in MONTHS:
        return (int(m.group(3)), MONTHS.index(m.group(1)) + 1, int(m.group(2))), raw
    m = re.fullmatch(r"([A-Za-z]+)\s+(\d{4})", raw)
    if m and m.group(1) in MONTHS:
        return (int(m.group(2)), MONTHS.index(m.group(1)) + 1, 0), raw
    m = re.search(r"(\d{4})", raw)
    if m:
        return (int(m.group(1)), 0, 0), m.group(1)
    return (9999, 0, 0), raw


def display_author(a):
    a = (a or "").strip()
    if not a or a.lower().startswith("unsigned"):
        return ""
    return a


def load_essays():
    essays = []
    for f in sorted(CONTENT.glob("*/*.md")):
        text = f.read_text(encoding="utf-8")
        m = re.match(r"---\n(.*?)\n---\n?(.*)", text, re.S)
        if not m:
            continue
        meta = yaml.safe_load(m.group(1)) or {}
        if meta.get("placeholder"):
            continue
        body = m.group(2).strip()
        if not body:
            continue
        slug = f.parent.name
        sort_key, date_disp = parse_date(str(meta.get("date", "")))
        essays.append({
            "id": f"e-{slug}-{f.stem}",
            "file": str(f.relative_to(ROOT)),
            "slug": slug,
            "parsha": meta.get("parsha", slug),
            "book": meta.get("book", ""),
            "order": meta.get("order", 999),
            "title": (meta.get("title") or "").strip(),
            "author": display_author(meta.get("author")),
            "date_key": sort_key,
            "date": date_disp,
            "body": body,
        })
    return essays


def meaningful_title(title, parsha_names):
    """Drop auto-generated titles like "Bo (2021)" or "Zichron Yonatan -- Bo 5778"."""
    if not title:
        return ""
    t = re.sub(r"\s+--\s+", " – ", title.strip())
    if "zichron" in t.lower():
        return ""
    if re.fullmatch(r".*\(\d{4}\)", t):
        return ""
    if t.lower() in parsha_names:
        return ""
    return t


def organize(essays):
    sections = {}
    for e in essays:
        s = sections.setdefault(e["slug"], {"slug": e["slug"], "name": e["parsha"],
                                            "essays": [], "holiday": False})
        if e["slug"] in HOLIDAY_PLACEMENT:
            s["part"], s["pos"] = HOLIDAY_PLACEMENT[e["slug"]]
            s["holiday"] = True
        else:
            s["part"] = e["book"]
            pos = ORDER_OVERRIDE.get(e["slug"], float(e["order"]))
            if "-" in e["slug"] and e["slug"] not in ORDER_OVERRIDE:
                pos += 0.1    # combined parshiot follow their single forms
            s["pos"] = pos
        s["essays"].append(e)
    unknown = [s["slug"] for s in sections.values() if s["part"] not in dict((p[0], p) for p in PARTS)]
    if unknown:
        sys.exit(f"Don't know which part these belong in: {unknown} -- add to HOLIDAY_PLACEMENT")
    names = {s["name"].lower() for s in sections.values()}
    for s in sections.values():
        s["essays"].sort(key=lambda e: (e["date_key"], e["id"]))
        for e in s["essays"]:
            e["shown_title"] = meaningful_title(e["title"], names)
    parts = []
    for key, title, sub in PARTS:
        secs = sorted((s for s in sections.values() if s["part"] == key), key=lambda s: s["pos"])
        parts.append({"key": key, "title": title, "sub": sub, "sections": secs})
    return parts


# ---------------------------------------------------------------- html

HEB = re.compile(r"[֐-׿]")
LATIN = re.compile(r"[A-Za-z]")


def body_html(md_text):
    # U+2011 (non-breaking hyphen) is missing from the fonts; it looks identical to "-".
    md_text = md_text.replace("‑", "-")
    out = markdown.markdown(md_text, extensions=["sane_lists"], output_format="html")
    # Paragraphs that begin with Hebrew (ignoring punctuation) read right-to-left.
    def fix(m):
        inner = m.group(1)
        plain = re.sub(r"<[^>]+>", "", inner)
        first = re.search(r"[A-Za-z֐-׿]", plain)
        if first and HEB.match(first.group(0)):
            return f'<p dir="rtl" class="he">{inner}</p>'
        return m.group(0)
    return re.sub(r"<p>(.*?)</p>", fix, out, flags=re.S)


def esc(s):
    return html.escape(s, quote=True)


def byline_text(e):
    return " · ".join(x for x in (e["author"], e["date"]) if x)


def essay_html(e, sec):
    head = e["shown_title"] or byline_text(e) or sec["name"]
    parts = [f'<section class="essay" id="{e["id"]}">',
             f'<h3 class="essay-title">{esc(head)}</h3>']
    if e["shown_title"] and byline_text(e):
        parts.append(f'<p class="byline">{esc(byline_text(e))}</p>')
    parts.append(body_html(e["body"]))
    parts.append("</section>")
    return "\n".join(parts)


def front_matter():
    text = (BOOK / "front-matter.md").read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---\n?(.*)", text, re.S)
    meta = yaml.safe_load(m.group(1))
    chunks = {}
    for block in re.split(r"^## ", m.group(2), flags=re.M):
        if block.strip():
            name, _, rest = block.partition("\n")
            chunks[name.strip().lower()] = rest.strip()
    return meta, chunks


def build_html(parts, meta, fm, mode):
    """mode is 'print' (page-number TOC/index) or 'epub' (linked TOC/index)."""
    title, subtitle = meta["title"], meta.get("subtitle", "")
    o = []
    o.append('<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8">')
    o.append(f"<title>{esc(title)}</title>")
    if mode == "print":
        o.append('<link rel="stylesheet" href="print.css">')
    o.append("</head><body>")

    # Title + copyright (the EPUB gets its title page from pandoc metadata).
    if mode == "print":
        o.append('<section class="title-page">')
        o.append(f'<h1 class="book-title">{esc(title)}</h1>')
        o.append('<p class="book-title-he" dir="rtl" lang="he">זכרון יונתן</p>')
        if subtitle:
            o.append(f'<p class="book-subtitle">{esc(subtitle)}</p>')
        if meta.get("credit"):
            o.append(f'<p class="book-credit">{esc(meta["credit"])}</p>')
        o.append("</section>")
    o.append('<section class="copyright-page" id="copyright">')
    if mode == "epub":
        o.append('<h1 class="fm-heading">Copyright</h1>')
    o.append(f'<p>{esc(title)}</p>')
    o.append(f'<p>Copyright © {meta.get("copyright_year")} {esc(meta.get("copyright_holder", ""))}. '
             "All rights reserved.</p>")
    o.append("<p>No part of this book may be reproduced in any form without written permission "
             "from the copyright holder, except for brief quotations.</p>")
    o.append(f'<p>ISBN: {esc(str(meta.get("isbn", "")))}</p>')
    o.append("<p>The essays in this collection are reproduced as originally written.</p>")
    o.append("</section>")

    for key, cls in (("dedication", "dedication"), ("introduction", "introduction")):
        if fm.get(key):
            o.append(f'<section class="{cls}" id="{key}">')
            o.append(f'<h1 class="fm-heading">{key.title()}</h1>' if key != "dedication" or mode == "epub"
                     else '<h1 class="fm-heading visually-hidden">Dedication</h1>')
            o.append(markdown.markdown(fm[key]))
            o.append("</section>")

    if mode == "print":
        o.append('<nav class="toc"><h1 class="fm-heading">Contents</h1><ul>')
        for k in ("introduction",):
            if fm.get(k):
                o.append(f'<li class="toc-fm"><a href="#{k}">{k.title()}</a></li>')
        for p in parts:
            o.append(f'<li class="toc-part"><a href="#part-{p["key"]}">{esc(p["title"])}</a></li>')
            for s in p["sections"]:
                cls = "toc-sec holiday" if s["holiday"] else "toc-sec"
                o.append(f'<li class="{cls}"><a href="#sec-{s["slug"]}">{esc(s["name"])}</a></li>')
        o.append('<li class="toc-part"><a href="#author-index">Index of Authors</a></li>')
        o.append("</ul></nav>")

    for i, p in enumerate(parts):
        first = " first-part" if i == 0 else ""
        o.append(f'<section class="part{first}" id="part-{p["key"]}">')
        o.append(f'<h1 class="part-title">{esc(p["title"])}</h1>')
        o.append(f'<p class="part-sub">{esc(p["sub"])}</p>')
        o.append("</section>")
        for s in p["sections"]:
            o.append(f'<section class="parsha" id="sec-{s["slug"]}">')
            label = "Festival" if s["holiday"] else "Parshat"
            o.append(f'<p class="parsha-label">{label}</p>')
            o.append(f'<h2 class="parsha-title">{esc(s["name"])}</h2>')
            for e in s["essays"]:
                o.append(essay_html(e, s))
            o.append("</section>")

    # Index of authors.
    by_author = defaultdict(list)
    for p in parts:
        for s in p["sections"]:
            for e in s["essays"]:
                if e["author"]:
                    by_author[e["author"]].append((s, e))
    o.append('<section class="author-index" id="author-index">')
    o.append('<h1 class="fm-heading">Index of Authors</h1>')
    for a in sorted(by_author, key=str.lower):
        o.append(f'<h4 class="ix-author">{esc(a)}</h4><ul class="ix">')
        for s, e in by_author[a]:
            label = s["name"] + (f' ({e["date_key"][0]})' if e["date_key"][0] != 9999 else "")
            if e["shown_title"]:
                label += f' — {e["shown_title"]}'
            o.append(f'<li><a href="#{e["id"]}">{esc(label)}</a></li>')
        o.append("</ul>")
    o.append("</section>")
    o.append("</body></html>")
    return "\n".join(o)


# ---------------------------------------------------------------- outputs

def build_pdf(html_text):
    from weasyprint import HTML
    src = BOOK / "_print.html"
    src.write_text(html_text, encoding="utf-8")
    doc = HTML(filename=str(src), base_url=str(BOOK)).render()
    path = OUT / "Zichron-Yonatan-paperback-6x9.pdf"
    doc.write_pdf(str(path))
    src.unlink()
    return path, len(doc.pages)


def build_epub(parts, meta, fm):
    """One XHTML file per front-matter page, book title page and parsha, with a nested TOC."""
    from ebooklib import epub

    book = epub.EpubBook()
    book.set_identifier(f"zichron-yonatan-{meta.get('copyright_year')}")
    book.set_title(meta["title"])
    book.set_language("en")
    book.add_author(meta.get("credit") or meta.get("copyright_holder", ""))
    book.add_metadata("DC", "rights",
                      f"Copyright © {meta.get('copyright_year')} {meta.get('copyright_holder', '')}")
    book.add_metadata("DC", "date", datetime.date.today().isoformat())
    if meta.get("subtitle"):
        book.add_metadata("DC", "description", meta["subtitle"])

    css = epub.EpubItem(uid="css", file_name="style/book.css", media_type="text/css",
                        content=(BOOK / "epub.css").read_text(encoding="utf-8"))
    book.add_item(css)
    for font in sorted((BOOK / "fonts").glob("noto-serif-hebrew-hebrew-*.woff")):
        book.add_item(epub.EpubItem(uid=font.stem, file_name=f"fonts/{font.name}",
                                    media_type="font/woff", content=font.read_bytes()))

    def page(fname, title, body):
        c = epub.EpubHtml(title=title, file_name=fname, lang="en")
        c.content = f"<html><head><title>{esc(title)}</title></head><body>{body}</body></html>"
        c.add_item(css)
        book.add_item(c)
        return c

    spine, toc = ["nav"], []
    title_body = (f'<section class="title-page"><h1 class="book-title">{esc(meta["title"])}</h1>'
                  '<p class="book-title-he" dir="rtl" lang="he">זכרון יונתן</p>'
                  + (f'<p class="book-subtitle">{esc(meta["subtitle"])}</p>' if meta.get("subtitle") else "")
                  + (f'<p class="book-credit">{esc(meta["credit"])}</p>' if meta.get("credit") else "")
                  + "</section>")
    spine.insert(0, page("title.xhtml", meta["title"], title_body))
    copyright_body = (f'<section class="copyright-page"><p>{esc(meta["title"])}</p>'
                      f'<p>Copyright © {meta.get("copyright_year")} {esc(meta.get("copyright_holder", ""))}. '
                      "All rights reserved.</p><p>No part of this book may be reproduced in any form without "
                      "written permission from the copyright holder, except for brief quotations.</p>"
                      f'<p>ISBN: {esc(str(meta.get("isbn", "")))}</p>'
                      "<p>The essays in this collection are reproduced as originally written.</p></section>")
    spine.append(page("copyright.xhtml", "Copyright", copyright_body))
    for key in ("dedication", "introduction"):
        if fm.get(key):
            head = "" if key == "dedication" else f'<h1 class="fm-heading">{key.title()}</h1>'
            c = page(f"{key}.xhtml", key.title(),
                     f'<section class="{key}">{head}{markdown.markdown(fm[key])}</section>')
            spine.append(c)
            toc.append(c)

    where = {}   # essay id -> file
    for p in parts:
        pc = page(f"part-{p['key'].lower()}.xhtml", p["title"],
                  f'<section class="part"><h1 class="part-title">{esc(p["title"])}</h1>'
                  f'<p class="part-sub">{esc(p["sub"])}</p></section>')
        spine.append(pc)
        children = []
        for s in p["sections"]:
            label = "Festival" if s["holiday"] else "Parshat"
            fname = f"{s['slug']}.xhtml"
            body = (f'<section class="parsha" id="sec-{s["slug"]}"><p class="parsha-label">{label}</p>'
                    f'<h2 class="parsha-title">{esc(s["name"])}</h2>'
                    + "".join(essay_html(e, s) for e in s["essays"]) + "</section>")
            c = page(fname, s["name"], body)
            spine.append(c)
            children.append(c)
            for e in s["essays"]:
                where[e["id"]] = fname
        toc.append((epub.Section(p["title"], href=pc.file_name), children))

    by_author = defaultdict(list)
    for p in parts:
        for s in p["sections"]:
            for e in s["essays"]:
                if e["author"]:
                    by_author[e["author"]].append((s, e))
    ix = ['<section class="author-index"><h1 class="fm-heading">Index of Authors</h1>']
    for a in sorted(by_author, key=str.lower):
        ix.append(f'<h4 class="ix-author">{esc(a)}</h4><ul class="ix">')
        for s, e in by_author[a]:
            label = s["name"] + (f' ({e["date_key"][0]})' if e["date_key"][0] != 9999 else "")
            if e["shown_title"]:
                label += f' — {e["shown_title"]}'
            ix.append(f'<li><a href="{where[e["id"]]}#{e["id"]}">{esc(label)}</a></li>')
        ix.append("</ul>")
    ix.append("</section>")
    ic = page("authors.xhtml", "Index of Authors", "".join(ix))
    spine.append(ic)
    toc.append(ic)

    book.toc = toc
    book.spine = spine
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    path = OUT / "Zichron-Yonatan.epub"
    epub.write_epub(str(path), book)
    return path


def main():
    OUT.mkdir(exist_ok=True)
    essays = load_essays()
    parts = organize(essays)
    meta, fm = front_matter()
    n_sec = sum(len(p["sections"]) for p in parts)
    print(f"{len(essays)} essays in {n_sec} sections")

    (OUT / "Zichron-Yonatan.html").write_text(
        build_html(parts, meta, fm, "epub").replace(
            "</head>", '<link rel="stylesheet" href="../epub.css"></head>'), encoding="utf-8")
    epub = build_epub(parts, meta, fm)
    print("wrote", epub.relative_to(ROOT))
    pdf, pages = build_pdf(build_html(parts, meta, fm, "print"))
    print("wrote", pdf.relative_to(ROOT), f"({pages} pages)")
    if pages > 700:
        print("NOTE: over 700 pages -- KDP requires an inside margin of at least 1.0in")


if __name__ == "__main__":
    main()
