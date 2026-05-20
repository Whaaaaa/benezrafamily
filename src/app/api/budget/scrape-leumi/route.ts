import { createScraper, CompanyTypes } from 'israeli-bank-scrapers'

export const dynamic = 'force-dynamic'

function isoToLeumiDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  return `${dd}/${mm}/${yy}`
}

export async function POST(req: Request) {
  const { month, username, password } = await req.json()

  if (!month || !username || !password) {
    return Response.json({ error: 'month, username, and password are required' }, { status: 400 })
  }

  const [year, monthNum] = month.split('-').map(Number)
  const startDate = new Date(year, monthNum - 1, 1)

  const scraper = createScraper({
    companyId: CompanyTypes.leumi,
    startDate,
    combineInstallments: false,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const result = await scraper.scrape({ username, password })

  if (!result.success) {
    return Response.json({ error: result.errorMessage ?? 'Scrape failed' }, { status: 500 })
  }

  const transactions: { date: string; description: string; amount: number }[] = []

  for (const account of result.accounts ?? []) {
    for (const txn of account.txns) {
      const txnMonth = txn.date.slice(0, 7)
      if (txnMonth !== month) continue

      const amount = -txn.chargedAmount
      if (amount === 0) continue

      transactions.push({
        date: isoToLeumiDate(txn.date),
        description: txn.description,
        amount,
      })
    }
  }

  return Response.json({ transactions })
}
