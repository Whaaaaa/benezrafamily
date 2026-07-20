# Status: 70 essays verified word-for-word

This site now only shows essays that were **re-fetched fresh from Google
Drive or Gmail and reproduced verbatim** (word-for-word, no paraphrasing).
Every essay page shows a "verbatim, [source]" tag. Everything else has been
pulled off the site rather than shown in a reworded/summarized form.

## Why this reset happened

An earlier pass populated this site with condensed/reworded versions of each
essay instead of the original text. That was wrong for a personal archive
like this, so the whole content set was rebuilt from scratch, re-fetching
and transcribing each source document exactly.

## Where things stand

Every Drive file ID that had been identified as of the last pass has now
been fetched, transcribed verbatim, and added. Two items from that list
were checked and intentionally left out rather than published:

- Shemos stub (2018) -- file 14VsAGBy3q0dxKhtYyCj3Wbc3mcpP5zonzxz2lOFQR2A is
  a genuine fragment in Drive, cutting off mid-sentence after two lines.
  Not worth a standalone page; Shemot is already covered by two complete
  essays (2017 and 2021).
- Beshalach (2022, "second copy") -- file
  1uJU4bbql8V5_fta84KZ-1N7ism1KFel17gLvHrW8x1U covers the same Shabbat
  Shira/Miriam's Song material already on the site as the existing 2022
  Beshalach essay; treated as a duplicate rather than added again.

## What's left to do

15 parshiot/holidays still show a `placeholder: true` page (see the
`000-pending.md` files) because no Drive or Gmail source has been located
for them yet in this pass: Behar-Bechukotai, Bechukotai, Chukat, Devarim,
Naso, Tazria-Metzora, Tu B'Shvat/Shovavim, Tzav, Vaera, Vayeishev,
Vayigash, Vezot Haberakhah, Yitro, Yom Kippur. To finish one, search Drive
(`search_files`) and Gmail (`search_threads`) for the parsha name plus
"Zichron Yonatan", then add a new `.md` file to `content/<parsha-slug>/`
with `verbatim: true` and the exact text (see any existing file for the
frontmatter format).

## Also still unread (not in Drive)

- .odt attachments sent directly by email from freedmanyosef@gmail.com (e.g.
  "194 - Naso - Rotten Wealth.odt") -- no attachment-download tool available
  in this session, and no copy found in Drive.
- A separate, complete 2019-2020 cycle written directly in Gmail message
  bodies (not saved to Drive) -- confirmed to exist via search but full text
  not yet pulled for most of it (2 of these -- Bereishit and Chayei Sarah --
  are done and included above).

## Adding more

Each essay is one `.md` file with YAML frontmatter (parsha, book, order,
date, title, author, source, verbatim, placeholder) followed by the exact
essay text. Set `verbatim: true` only once you've checked the text against
the actual source document.
