# Zichron Yonatan: the book

These files turn the website archive (`content/zichronyonatan/`) into files you can upload to Amazon KDP.

| File | Use it for |
|---|---|
| `output/Zichron-Yonatan-paperback-6x9.pdf` | KDP **Paperback** manuscript (interior). 6 x 9 in, no bleed, black & white, 613 pages. |
| `output/Zichron-Yonatan.epub` | KDP **Kindle eBook** manuscript. |
| `output/Zichron-Yonatan.html` | Proofreading copy you can open in any browser. |

## Getting the latest essays

The essays live in the website's database. To rebuild the book with everything that's on the site now:

1. Choose the essays on the site's manage page: **Add to book** / **Remove from book** on each one, and Show → "In the book" to review the selection. Edit an essay's text with its **Edit** button; the same text is used on the site, in emails and in the book.
2. Fill in the title, dedication, introduction and ISBN under **Book details** on the admin page.
3. Click **Download book data** on the admin page. Save the file as `book/data/essays.json` (or send it to Claude), then rebuild.

The export holds only the essays selected for the book, plus the book details. When it's present, `front-matter.md` is ignored.

Without that file, the build falls back to the old markdown files in `content/zichronyonatan/`.

## Before you publish

1. Edit `front-matter.md`. Replace the **[DEDICATION]** and **[INTRODUCTION]** placeholders, and check the title, subtitle, credit line and copyright holder.
2. After KDP assigns your ISBN, paste it into `isbn:` in the same file.
3. Rebuild:
   ```
   pip install weasyprint markdown pyyaml ebooklib
   python3 book/build.py
   ```

## What's in it

- 257 essays, ordered by the yearly reading cycle from Bereishit to Simchat Torah. Each festival sits where it falls in the year, for example Chanukah between Vayeishev and Miketz and Pesach after Tzav. Within each parsha the essays run oldest first.
- Front matter: title page, copyright page, dedication, introduction and table of contents. Back matter: an index of authors.
- Essays are reproduced word for word. Auto-generated titles like "Bo (2021)" are dropped, and essays marked "Unsigned" are shown without a byline.
- Not included:
  - The placeholder pages for Ha'azinu, Vezot HaBerakhah and Tu B'Shvat, which have no essay yet.
  - Hidden essays (when built from `essays.json`).

## KDP settings

- **Paperback:** trim 6 x 9 in, black & white interior on cream or white paper, bleed **No**. Make the cover with KDP Cover Creator, or download KDP's cover template for a 613-page book.
- **Kindle:** upload the `.epub` and add a cover image (1600 x 2560 px recommended).
- Margins are 0.9 in inside and 0.6 in outside. That meets KDP's minimum up to 700 pages. If the book grows past 700 pages, raise the inside margin in `print.css` to 1.0 in.

Fonts: EB Garamond and Noto Serif Hebrew, both under the SIL Open Font License (`fonts/`), which allows embedding them in a commercial book.
