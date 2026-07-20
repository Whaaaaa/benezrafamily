# Status: 66 of ~90 essays verified word-for-word

This site now only shows essays that were **re-fetched fresh from Google
Drive or Gmail and reproduced verbatim** (word-for-word, no paraphrasing).
Every essay page shows a "verbatim, [source]" tag. Everything else has been
pulled off the site rather than shown in a reworded/summarized form.

## Why this reset happened

An earlier pass populated this site with condensed/reworded versions of each
essay instead of the original text. That was wrong for a personal archive
like this, so the whole content set was rebuilt from scratch, re-fetching
and transcribing each source document exactly.

## What's left to do

40 more parshiot/holidays have a known essay in the Drive archive that
hasn't been re-verified yet in this pass. To finish one: open the file with
Google Drive `read_file_content`, then add a new `.md` file to
`content/<parsha-slug>/` with `verbatim: true` and the exact text (see any
existing file for the frontmatter format).

Known remaining Drive file IDs (title -- file ID):
- Vayakhel-Pekudei (2020) -- 1pFwtznMh2nNUD6cr2O-_Lmo9huY9hs4-PITTGS-t1_8
- Mishpatim (2020) -- 1RljsNV-HU4Ao19CTdgnSM-Pky2URNQudk26D_fPgEtY
- Matot-Masei (2019) -- 1CULEYvVb-Xabo2kTjC7di5v_IOVaHtQtq5pMlbBetpY
- Shavuot (2018) -- 1XLrg6t30G0RPO2o827wLu1xglAYVPJ7qsEoF8wm_kXs
- Shemos stub (2018, very short/incomplete in Drive) -- 14VsAGBy3q0dxKhtYyCj3Wbc3mcpP5zonzxz2lOFQR2A
- Beshalach (2022, second copy) -- 1uJU4bbql8V5_fta84KZ-1N7ism1KFel17gLvHrW8x1U

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
