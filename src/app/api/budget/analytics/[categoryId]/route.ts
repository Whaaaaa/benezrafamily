import sql, { initDb } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  await initDb()
  const { categoryId } = await params

  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const earliest = months[0]
  const latest = months[months.length - 1]

  const ccMonthly = await sql`
    SELECT month, SUM(amount) as total
    FROM cc_transactions
    WHERE category_id = ${categoryId} AND month >= ${earliest} AND month <= ${latest}
    GROUP BY month
  `

  const manualMonthly = await sql`
    SELECT SUBSTRING(date, 1, 7) as month, SUM(amount) as total
    FROM manual_transactions
    WHERE category_id = ${categoryId}
      AND is_recurring = false
      AND SUBSTRING(date, 1, 7) >= ${earliest}
      AND SUBSTRING(date, 1, 7) <= ${latest}
    GROUP BY SUBSTRING(date, 1, 7)
  `

  const recurringRows = await sql`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM manual_transactions
    WHERE category_id = ${categoryId} AND is_recurring = true
  `
  const recurringMonthly = Number(recurringRows[0]?.total ?? 0)

  const totalsMap: Record<string, number> = {}
  for (const m of months) totalsMap[m] = recurringMonthly
  for (const r of ccMonthly) totalsMap[r.month] = (totalsMap[r.month] ?? 0) + Number(r.total)
  for (const r of manualMonthly) totalsMap[r.month] = (totalsMap[r.month] ?? 0) + Number(r.total)

  const monthlyTotals = months.map(m => ({ month: m, total: totalsMap[m] ?? 0 }))

  const ccVendors = await sql`
    SELECT description, SUM(amount) as total
    FROM cc_transactions
    WHERE category_id = ${categoryId}
    GROUP BY description
    ORDER BY SUM(amount) DESC
    LIMIT 10
  `

  const manualVendors = await sql`
    SELECT description, SUM(amount) as total
    FROM manual_transactions
    WHERE category_id = ${categoryId}
    GROUP BY description
    ORDER BY SUM(amount) DESC
    LIMIT 10
  `

  const vendorMap: Record<string, number> = {}
  for (const v of ccVendors) vendorMap[v.description] = (vendorMap[v.description] ?? 0) + Number(v.total)
  for (const v of manualVendors) vendorMap[v.description] = (vendorMap[v.description] ?? 0) + Number(v.total)

  const topVendors = Object.entries(vendorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([description, total]) => ({ description, total }))

  return Response.json({ monthlyTotals, topVendors })
}
