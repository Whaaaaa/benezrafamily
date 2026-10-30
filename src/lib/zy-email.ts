import nodemailer from "nodemailer";
import sql, { initZyDb } from "@/lib/db";
import { getCurrentParshaSlug } from "@/lib/current-parsha";
import { getArchiveParshiot, formatEssayDate } from "@/lib/content-zichronyonatan";
import { emailifyHtml, htmlToText } from "@/lib/zy-html";

export const SITE_URL = (process.env.SITE_URL || "https://benezrafamily.vercel.app").replace(/\/$/, "");

// How far back an upload still counts as "this week's" dvar Torah for the
// weekly email. Covers people who write a week or two ahead.
const WEEKLY_WINDOW_DAYS = 21;

export type ZyEssayRow = {
  id: string;
  parsha_slug: string;
  title: string;
  author: string;
  body_html: string;
  created_at: string | Date;
  emailed_at: string | Date | null;
};

export type Subscriber = { email: string; name: string; token: string };

export function emailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport() {
  // Defaults to Gmail (use an App Password); any SMTP provider works by
  // setting SMTP_HOST / SMTP_PORT.
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    pool: true,
    maxConnections: 1,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function fromAddress() {
  return `"Zichron Yonatan" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;
}

function parshaName(slug: string): string {
  return getArchiveParshiot().find((p) => p.slug === slug)?.parsha || slug;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function unsubscribeUrl(token: string) {
  return `${SITE_URL}/zichronyonatan/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildEssayEmail(essay: ZyEssayRow, token: string) {
  const parsha = parshaName(essay.parsha_slug);
  const essayUrl = `${SITE_URL}/zichronyonatan/parsha/${essay.parsha_slug}`;
  const unsubUrl = unsubscribeUrl(token);
  const date = formatEssayDate(new Date(essay.created_at));
  const meta = [date, essay.author].filter(Boolean).join(" · ");
  const serif = "Georgia, 'Times New Roman', serif";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(essay.title)}</title>
</head>
<body style="margin:0;padding:0;background:#faf5e8;">
<div style="display:none;max-height:0;overflow:hidden;">This week's dvar Torah for ${esc(parsha)}${essay.author ? `, by ${esc(essay.author)}` : ""}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5e8;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">

  <tr><td align="center" style="background:#1c2a44;padding:36px 24px 30px;border-radius:6px 6px 0 0;">
    <img src="${SITE_URL}/yonatan-photo.jpg" width="84" height="84" alt="" style="display:block;width:84px;height:84px;border-radius:42px;border:3px solid #cf9f60;object-fit:cover;margin:0 auto 18px;">
    <div style="font-family:${serif};font-size:30px;font-weight:bold;color:#faf5e8;letter-spacing:0.01em;">Zichron Yonatan</div>
    <div style="font-family:${serif};font-size:17px;color:#cf9f60;margin-top:6px;letter-spacing:0.03em;" dir="rtl">זכרון יונתן</div>
  </td></tr>

  <tr><td style="background:#fffdf8;padding:32px 36px 12px;border-left:1px solid #e6dfcf;border-right:1px solid #e6dfcf;">
    <div style="font-family:${serif};font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#6f7d5c;margin-bottom:6px;">This week&rsquo;s parsha &middot; ${esc(parsha)}</div>
    <h1 style="margin:0 0 8px;font-family:${serif};font-size:26px;line-height:1.3;font-weight:bold;color:#1c2a44;">${esc(essay.title)}</h1>
    <div style="font-family:${serif};font-size:13px;letter-spacing:0.05em;text-transform:uppercase;color:#6c6252;padding-bottom:20px;margin-bottom:24px;border-bottom:1px solid #e6dfcf;">${esc(meta)}</div>
    ${emailifyHtml(essay.body_html)}
  </td></tr>

  <tr><td align="center" style="background:#fffdf8;padding:8px 36px 36px;border-left:1px solid #e6dfcf;border-right:1px solid #e6dfcf;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#1c2a44;border-radius:4px;">
      <a href="${essayUrl}" style="display:inline-block;padding:12px 26px;font-family:${serif};font-size:15px;font-weight:bold;color:#faf5e8;text-decoration:none;">Read more divrei Torah on ${esc(parsha)} &rarr;</a>
    </td></tr></table>
    <div style="margin-top:14px;font-family:${serif};font-size:14px;"><a href="${SITE_URL}/zichronyonatan" style="color:#a3763f;">Browse the full Zichron Yonatan archive</a></div>
  </td></tr>

  <tr><td align="center" style="background:#1c2a44;border-top:3px solid #a3763f;padding:26px 28px;border-radius:0 0 6px 6px;">
    <div style="font-family:${serif};font-size:14px;line-height:1.6;color:#b7c3d8;">The learning on this site should be a merit for the neshama of Yonatan ben Avraham Avinu a&quot;h.</div>
    <div style="font-family:${serif};font-size:12px;line-height:1.6;color:#8796ad;margin-top:14px;">You&rsquo;re receiving this because you&rsquo;re on the Zichron Yonatan mailing list.<br><a href="${unsubUrl}" style="color:#b7c3d8;">Unsubscribe</a></div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `ZICHRON YONATAN — ${parsha}`,
    "",
    essay.title,
    meta,
    "",
    htmlToText(essay.body_html),
    "",
    `Read more on the site: ${essayUrl}`,
    "",
    "The learning on this site should be a merit for the neshama of Yonatan ben Avraham Avinu a\"h.",
    "",
    `Unsubscribe: ${unsubUrl}`,
  ].join("\n");

  return {
    subject: `${essay.title} · Zichron Yonatan`,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${SITE_URL}/api/zichronyonatan/unsubscribe?token=${encodeURIComponent(token)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

export async function sendEssay(
  essay: ZyEssayRow,
  recipients: Subscriber[]
): Promise<{ sent: number; failed: string[] }> {
  if (!emailConfigured()) throw new Error("Email is not configured (SMTP_USER / SMTP_PASS)");
  const t = transport();
  let sent = 0;
  const failed: string[] = [];
  try {
    // One message per subscriber so nobody sees the list and each gets a
    // personal unsubscribe link.
    for (const r of recipients) {
      const msg = buildEssayEmail(essay, r.token);
      try {
        await t.sendMail({
          from: fromAddress(),
          to: r.name ? `"${r.name.replace(/"/g, "")}" <${r.email}>` : r.email,
          ...msg,
        });
        sent++;
      } catch (err) {
        console.error("zy email failed", r.email, err);
        failed.push(r.email);
      }
    }
  } finally {
    t.close();
  }
  return { sent, failed };
}

export type LogKind = "scheduled" | "manual" | "test" | "skipped" | "cancelled";

export async function logEmail(entry: {
  kind: LogKind;
  essay?: Pick<ZyEssayRow, "id" | "title"> | null;
  recipients?: number;
  failed?: string[];
  note?: string;
  sendDate?: string | null;
}) {
  await sql`
    INSERT INTO zy_email_log (id, kind, essay_id, title, recipients, failures, failed_list, note, send_date)
    VALUES (
      ${crypto.randomUUID()}, ${entry.kind}, ${entry.essay?.id ?? ""}, ${entry.essay?.title ?? ""},
      ${entry.recipients ?? 0}, ${entry.failed?.length ?? 0}, ${(entry.failed ?? []).join(", ")},
      ${entry.note ?? ""}, ${entry.sendDate ?? null}
    )
  `;
}

export async function sendEssayToList(
  essay: ZyEssayRow,
  kind: "scheduled" | "manual",
  sendDate: string | null = null
) {
  await initZyDb();
  const subs = (await sql`SELECT email, name, token FROM zy_subscribers ORDER BY email`) as Subscriber[];
  const { sent, failed } = await sendEssay(essay, subs);
  await sql`UPDATE zy_essays SET emailed_at = NOW() WHERE id = ${essay.id}`;
  await logEmail({ kind, essay, recipients: sent, failed, sendDate });
  return { sent, failed };
}

// ---- Schedule: Fridays at 3:00 PM Israel time ----
//
// Vercel crons run in UTC and Israel switches between UTC+2 and UTC+3, so
// vercel.json fires at both 12:00 and 13:00 UTC on Fridays. Whichever run
// lands in the send window (Israel time) sends; the log's send_date keeps
// the other from sending again.

const TZ = "Asia/Jerusalem";
export const SEND_HOUR = 15; // 3 PM Israel
const SEND_WINDOW_END = SEND_HOUR + 2; // tolerate a late cron run

export function israelParts(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday as string,
    hour: Number(parts.hour),
  };
}

export function inSendWindow(now: Date = new Date()) {
  const p = israelParts(now);
  return p.weekday === "Fri" && p.hour >= SEND_HOUR && p.hour < SEND_WINDOW_END;
}

/** Whether a scheduled run already happened (sent, skipped or cancelled) for that Friday. */
async function scheduledRunDone(sendDate: string) {
  const rows = await sql`
    SELECT 1 FROM zy_email_log
    WHERE send_date = ${sendDate} AND kind IN ('scheduled', 'skipped', 'cancelled')
    LIMIT 1
  `;
  return rows.length > 0;
}

export function sendDateLabel(sendDate: string) {
  const d = new Date(`${sendDate}T12:00:00Z`);
  const day = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  return `${day} at 3:00 PM Israel time`;
}

/** The Friday (Israel date) of the next scheduled email that hasn't run yet. */
export async function getNextSendDate(now: Date = new Date()): Promise<string> {
  await initZyDb();
  for (let i = 0; i < 15; i++) {
    const p = israelParts(new Date(now.getTime() + i * 86400000));
    if (p.weekday !== "Fri") continue;
    if (i === 0 && p.hour >= SEND_WINDOW_END) continue;
    if (await scheduledRunDone(p.date)) continue;
    return p.date;
  }
  throw new Error("Could not find the next Friday");
}

export async function isSendCancelled(sendDate: string) {
  const rows = await sql`SELECT 1 FROM zy_schedule_skips WHERE send_date = ${sendDate}`;
  return rows.length > 0;
}

export async function setSendCancelled(sendDate: string, cancelled: boolean) {
  await initZyDb();
  if (cancelled) {
    await sql`INSERT INTO zy_schedule_skips (send_date) VALUES (${sendDate}) ON CONFLICT DO NOTHING`;
  } else {
    await sql`DELETE FROM zy_schedule_skips WHERE send_date = ${sendDate}`;
  }
}

/**
 * The dvar Torah a given Friday's email would carry: the most recent upload
 * for that Shabbat's parsha (or holiday), uploaded within the last few weeks.
 */
export async function getWeeklyEssay(sendDate?: string) {
  await initZyDb();
  const date = sendDate || (await getNextSendDate());
  const friday = new Date(`${date}T12:00:00Z`);
  const slug = getCurrentParshaSlug(friday);
  if (!slug) return { sendDate: date, slug: null, parsha: null, essay: null };
  const since = new Date(friday.getTime() - WEEKLY_WINDOW_DAYS * 86400000);
  const rows = (await sql`
    SELECT * FROM zy_essays
    WHERE parsha_slug = ${slug} AND created_at >= ${since.toISOString()}
    ORDER BY created_at DESC LIMIT 1
  `) as ZyEssayRow[];
  return { sendDate: date, slug, parsha: parshaName(slug), essay: rows[0] ?? null };
}

/** Everything the admin page needs to describe the next scheduled email. */
export async function getNextScheduled() {
  const weekly = await getWeeklyEssay();
  return {
    ...weekly,
    label: sendDateLabel(weekly.sendDate),
    cancelled: await isSendCancelled(weekly.sendDate),
  };
}
