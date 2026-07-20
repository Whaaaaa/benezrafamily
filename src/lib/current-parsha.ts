import { HDate, Sedra } from "@hebcal/core";

// Maps hebcal's transliterated parsha/holiday names to this site's
// content/zichronyonatan/<slug> directories. Some parshiot are only ever
// covered here as part of a combined reading (no solo directory exists),
// so a solo hebcal name can still resolve to a combined slug.
const PARSHA_SLUG: Record<string, string> = {
  Bereshit: "bereishit",
  Noach: "noach",
  "Lech-Lecha": "lech-lecha",
  Vayera: "vayeira",
  "Chayei Sara": "chayei-sarah",
  Toldot: "toldot",
  Vayetzei: "vayeitzei",
  Vayishlach: "vayishlach",
  Vayeshev: "vayeishev",
  Miketz: "miketz",
  Vayigash: "vayigash",
  Vayechi: "vayechi",
  Shemot: "shemot",
  Vaera: "vaera",
  Bo: "bo",
  Beshalach: "beshalach",
  Yitro: "yitro",
  Mishpatim: "mishpatim",
  Terumah: "terumah",
  Tetzaveh: "tetzaveh",
  "Ki Tisa": "ki-tisa",
  Vayakhel: "vayakhel-pekudei",
  Pekudei: "pekudei",
  Vayikra: "vayikra",
  Tzav: "tzav",
  Shmini: "shemini",
  Tazria: "tazria-metzora",
  Metzora: "tazria-metzora",
  "Achrei Mot": "acharei-mot-kedoshim",
  Kedoshim: "acharei-mot-kedoshim",
  Emor: "emor",
  Behar: "behar",
  Bechukotai: "bechukotai",
  Bamidbar: "bamidbar",
  Nasso: "naso",
  "Beha'alotcha": "behaalotecha",
  "Sh'lach": "shelach",
  Korach: "korach",
  Chukat: "chukat",
  Balak: "balak",
  Pinchas: "pinchas",
  Matot: "matot-masei",
  Masei: "matot-masei",
  Devarim: "devarim",
  Vaetchanan: "vaetchanan",
  Eikev: "eikev",
  "Re'eh": "re-eh",
  Shoftim: "shoftim",
  "Ki Teitzei": "ki-teitzei",
  "Ki Tavo": "ki-tavo",
  Nitzavim: "nitzavim-vayelech",
  Vayeilech: "nitzavim-vayelech",
  "Ha'azinu": "", // no page exists for this parsha yet
  "Vezot Haberakhah": "vezot-haberakhah",
  // combined readings
  "Achrei Mot-Kedoshim": "acharei-mot-kedoshim",
  "Behar-Bechukotai": "behar-bechukotai",
  "Chukat-Balak": "chukat", // no combined-reading page exists; falls back to Chukat
  "Matot-Masei": "matot-masei",
  "Nitzavim-Vayeilech": "nitzavim-vayelech",
  "Tazria-Metzora": "tazria-metzora",
  "Vayakhel-Pekudei": "vayakhel-pekudei",
};

// Weeks where a Yom Tov displaces the regular weekly parsha reading.
const CHAG_SLUG: Record<string, string> = {
  "Rosh Hashana": "rosh-hashanah",
  "Yom Kippur": "yom-kippur",
  Sukkot: "sukkot",
  "Sukkot Shabbat Chol ha-Moed": "sukkot",
  "Shmini Atzeret": "shmini-atzeret-simchat-torah",
  Pesach: "pesach",
  "Pesach I": "pesach",
  "Pesach VII": "pesach",
  "Pesach VIII": "pesach",
  "Pesach Shabbat Chol ha-Moed": "pesach",
  Shavuot: "shavuot",
};

/**
 * Returns the content/zichronyonatan/<slug> for the parsha (or holiday
 * reading) read on the Shabbat on or after `today`, or null if there's no
 * matching page on this site.
 */
export function getCurrentParshaSlug(today: Date = new Date()): string | null {
  const hd = new HDate(today);
  const sedra = new Sedra(hd.getFullYear(), true /* Israel reading schedule */);
  const result = sedra.lookup(hd);

  if (result.chag) {
    const slug = CHAG_SLUG[result.parsha[0]];
    return slug || null;
  }

  const name = result.parsha.length > 1 ? result.parsha.join("-") : result.parsha[0];
  const slug = PARSHA_SLUG[name] ?? PARSHA_SLUG[result.parsha[0]];
  return slug || null;
}
