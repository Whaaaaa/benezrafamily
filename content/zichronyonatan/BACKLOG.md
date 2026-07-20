# Status: 42 of ~90 essays verified word-for-word

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
- Ki Teitzei -- 1TLglZLvyJPs-JKkiGlYdfSEa482KtytnRR1JJDi1dzI
- Toldos -- 13FE0YhXoemrrLYUVt2qrLrJPxLP5zTBb_n3DBbWEj_U
- Chayei Sarah #13 -- 1c9yti6glJfTtTDu-yLOoMn4mZI0qCWypFH1_091eoS0
- Sukkot #8 -- 1EjPSsWj2a1_HM6J2XkTpkF5WZhlae4JJCY-du_6V5EQ
- Ki Tavo (2017/2020) -- 1PaixbQ4-NE1FtWmvTCuI38t0ah4jOI1XthooEJW_3Ro
- Shmini Atzeret #9 -- 1Wp6OtjE4Tr_j0hIkD70c5HEUmmvrWZW0aHQFoVSq1h4
- Terumah (2021) -- 1niK698rkzRmdKg8pHMIBD8dybCDA7OAVgiyepqUyFs8
- Pinchas (2022, Yehoshua) -- 1WXZqgk6Ba_Uz-chTeajIxF4B96sf9yb0IT-Hx1a4zl0
- Noach (2023) -- 1kVyGW22Gv8tJYYyYZX9OWSlRoosqBmD750hcc_0SJU0
- Vayishlach #15 -- 1izATPyxwHjywb5PTUN3a0OVhZcmBRckLUary3in4imQ
- Re'eh (2021) -- 1QZKwr2vdm3JgPJHxaOkRQq5Zxh526MX5RABAhTb9pq8
- Shelach (2021) -- 1VooXXUbucc1Gq4fh8VnPcKeQo-1tf-ryqBRS7zLtPcQ
- Lag Ba'Omer -- 1QVDkrmrNqDDIPRy24iJSTtFqSgyrKo_hInfQLMRR9_s
- Shemini (2021) -- 1vrR5hsFbwStCQH_YFXZ8y7fbKwyzqZ9-LU6DQmwt3Ws
- Vayikra (2021) -- 1t2pLBFnqWk60edst_MYdR6Wk_Wq5_pb4v1W4PIfzQ20
- Beshalach (2021, Jan) -- 1XceBDv_U38UyTSp6RroQt-Wno_aDGpfyLto856lLnT4
- Shemot (2021) -- 1xigH-JA6UvkGOknw61O7NjFkmTgjFXeVveeAViuhM7c
- Chanukah (2020) -- 1cKB3i4ysUFlVXqWIB0zwaS3-9E-_QGx4MmSXRlksQHE
- Toldos (2020) -- 1HL6QoI1Iwb-7_0iQ5VAA0-ulSdI6Gj0EuxQVnXbQUj4
- Lech Lecha (2020) -- 1tueNaPoyChP9ecHQSkAPqpLRww9xWhXkeiKA2NrJATw
- Ki Tavo (2020) -- 1tv1h3zICy5-A_HwVxk39v5KTIsDuVLdTrDA5zGM8FQU
- Pinchas (2020) -- 1ZTVe1RvzrJTkdBFg3Mhkf5zUEo9R4lLANsQWbPIPiZ0
- Korach (2020) -- 187a4v8DtS-6pS0rWzYZS9JwIyg4Pc7xJvrGgdI8XCTo
- Acharei Mot-Kedoshim (2020) -- 1o6uysPEyGNYysxDq6wJteyL-yinsrzlmKEHqRd6pE5k
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
