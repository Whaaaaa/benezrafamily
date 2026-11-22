# Zichron Yonatan: the book

These files turn the website archive (`content/zichronyonatan/`) into files you can upload to Amazon KDP.

| File | Use it for |
|---|---|
| `output/Zichron-Yonatan-paperback-6x9.pdf` | KDP **Paperback** manuscript (interior). 6 x 9 in, no bleed, black & white, 576 pages. |
| `output/Zichron-Yonatan.epub` | KDP **Kindle eBook** manuscript. |
| `output/Zichron-Yonatan.html` | Proofreading copy you can open in any browser. |

## Before you publish

1. Edit `front-matter.md`. Replace the **[DEDICATION]** and **[INTRODUCTION]** placeholders, and check the title, subtitle, credit line and copyright holder.
2. After KDP assigns your ISBN, paste it into `isbn:` in the same file.
3. Rebuild:
   ```
   pip install weasyprint markdown pyyaml ebooklib
   python3 book/build.py
   ```

## What's in it

- 241 essays, ordered by the yearly reading cycle from Bereishit to Simchat Torah. Each festival sits where it falls in the year, for example Chanukah between Vayeishev and Miketz and Pesach after Tzav. Within each parsha the essays run oldest first.
- Front matter: title page, copyright page, dedication, introduction and table of contents. Back matter: an index of authors.
- Essays are reproduced word for word. Auto-generated titles like "Bo (2021)" are dropped, and essays marked "Unsigned" are shown without a byline.
- Not included:
  - The placeholder pages for Ha'azinu, Vezot HaBerakhah and Tu B'Shvat, which have no essay yet.
  - Anything uploaded, edited or hidden through the website's admin pages. That lives in the database, not in this repo.

## KDP settings

- **Paperback:** trim 6 x 9 in, black & white interior on cream or white paper, bleed **No**. Make the cover with KDP Cover Creator, or download KDP's cover template for a 576-page book.
- **Kindle:** upload the `.epub` and add a cover image (1600 x 2560 px recommended).
- Margins are 0.9 in inside and 0.6 in outside. That meets KDP's minimum up to 700 pages. If the book grows past 700 pages, raise the inside margin in `print.css` to 1.0 in.

Fonts: EB Garamond and Noto Serif Hebrew, both under the SIL Open Font License (`fonts/`), which allows embedding them in a commercial book.
