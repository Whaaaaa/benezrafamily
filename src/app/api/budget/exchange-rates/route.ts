// Proxies exchange rates from exchangerate-api.com with ILS as base.
// rates[currency] = how many units of that currency equal 1 ILS.
// To convert X foreign units to ILS: X / rates[currency]
export async function GET() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/ILS')
    if (!res.ok) throw new Error('upstream error')
    const data = await res.json()
    return Response.json({ rates: data.rates as Record<string, number>, date: data.date })
  } catch {
    return Response.json({ rates: null, date: null }, { status: 502 })
  }
}
