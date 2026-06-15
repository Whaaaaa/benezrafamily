# Avi Calendar — Push Reminder Setup

The `/aviadmin` calendar can send push notifications to a phone for upcoming
jobs, classes, and assignment due dates. The UI, subscription storage, and the
sending/cron endpoints are all built in — they just need a few environment
variables and a scheduled trigger to go live.

## 1. Generate VAPID keys (once)

```bash
npx web-push generate-vapid-keys
```

## 2. Set environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `VAPID_PUBLIC_KEY` | yes | From the command above |
| `VAPID_PRIVATE_KEY` | yes | From the command above — keep secret |
| `VAPID_SUBJECT` | recommended | `mailto:you@example.com` |
| `CRON_SECRET` | recommended | Protects the reminders endpoint. On Vercel, setting this makes Cron send it automatically as a Bearer token. |
| `REMINDER_LEAD_MINUTES` | optional | How many minutes before an item to notify (default `30`). |

Until `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` are set, the in-app "🔔 Off"
button reports that push is not configured, and no notifications are sent —
everything else (calendar, reminders toggles) works normally.

## 3. Schedule the reminder check

The endpoint `GET /api/aviadmin/cron/reminders` looks for items whose
start/due time is within the lead window, sends a push to every subscribed
device, and marks them as reminded.

- **Vercel:** `vercel.json` already declares a cron every 5 minutes. Set
  `CRON_SECRET` so the scheduled request is authenticated.
- **Any host / external scheduler** (e.g. cron-job.org): hit
  `https://YOUR_DOMAIN/api/aviadmin/cron/reminders?secret=YOUR_CRON_SECRET`
  every few minutes.

## 4. Using it

On `/aviadmin`, tap the bell button in the header to enable notifications on
that device (grants browser permission and registers the service worker at
`/aviadmin-sw.js`). On iOS, the site must be added to the Home Screen first —
web push only works for installed PWAs.

Each new job, class, or assignment has a "🔔 Reminders" toggle (on by default)
that controls whether that item triggers a reminder.

You can verify delivery with `POST /api/aviadmin/push/test`.
