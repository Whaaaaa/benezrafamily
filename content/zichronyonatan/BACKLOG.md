# Status: 92 essays verified word-for-word

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

A large, previously-untapped source turned up in this pass: a personal
Gmail archive (benezra.noah@gmail.com, "Zichron Yonatan" weekly Torah
emails going back to 2017) and a much bigger Drive folder of the same
material than the small "Zichron Yonaton" shared folder used earlier.
Searching both located essays for 13 of the 15 parshiot/holidays that
previously had no known source, plus several bonus essays for parshiot
already covered (Bamidbar, Balak, Pesach picked up extra entries as a
byproduct of the search).

Two items were checked earlier and intentionally left out rather than
published:

- Shemos stub (2018) -- file 14VsAGBy3q0dxKhtYyCj3Wbc3mcpP5zonzxz2lOFQR2A is
  a genuine fragment in Drive, cutting off mid-sentence after two lines.
  Not worth a standalone page; Shemot is already covered by two complete
  essays (2017 and 2021).
- Beshalach (2022, "second copy") -- file
  1uJU4bbql8V5_fta84KZ-1N7ism1KFel17gLvHrW8x1U covers the same Shabbat
  Shira/Miriam's Song material already on the site as the existing 2022
  Beshalach essay; treated as a duplicate rather than added again.

## What's left to do

Only 2 parshiot/holidays still show a `placeholder: true` page:

- **Tu B'Shvat / Shovavim**
- **Vezot Haberakhah**

Both were searched exhaustively this pass -- Drive title search (multiple
transliteration spellings: Tu Bishvat, Bshvat, Shevat, Shovavim, Shovevim;
Vezos, Zos, Haberakhah, Habrachah) and Gmail subject search (same
variants, `from:benezra.noah@gmail.com`) turned up nothing. It's possible
no essay was ever written for these two, since Tu B'Shvat is a minor day
and Vezot Haberakhah (read on Simchat Torah) may be covered instead by the
existing Simchat Torah / Shmini Atzeret essays. To close these out for
good, it would help to ask the family directly, or search Gmail without
the `benezra.noah@gmail.com` sender restriction (other family members --
kiefferavi@gmail.com, moo.kieffer@gmail.com, freedmanyosef@gmail.com --
may have written one that was never forwarded to that inbox).

## Also still unread (not fully searched)

- .odt attachments sent directly by email from freedmanyosef@gmail.com (e.g.
  "194 - Naso - Rotten Wealth.odt") -- no attachment-download tool available
  in this session, and no copy found in Drive.
- The Gmail search this pass only scratched the surface of the full
  "Zichron Yonatan" archive (estimated 200+ matching threads from 2017-2023
  in benezra.noah@gmail.com's mailbox alone) -- only used to fill the 15
  gaps above. Many parshiot likely have additional undiscovered essays
  (different years/authors) sitting in that same inbox if someone wants to
  keep expanding the archive beyond one essay per parsha.

## Adding more

Each essay is one `.md` file with YAML frontmatter (parsha, book, order,
date, title, author, source, verbatim, placeholder) followed by the exact
essay text. Set `verbatim: true` only once you've checked the text against
the actual source document. Use the Drive/Gmail owner's email as a strong
signal for uncredited authors -- e.g. everything owned by
kiefferavi@gmail.com in Drive turned out to be written by "Avi" even when
unsigned in the text.
