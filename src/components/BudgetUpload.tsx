'use client'

import { useState, useRef } from 'react'

type Transaction = {
  date: string
  description: string
  amount: number
}

function parseCSV(text: string): { transactions: Transaction[]; error: string } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { transactions: [], error: 'File appears empty.' }

  const raw = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())

  const dateIdx = raw.findIndex(h => h.includes('date'))
  const descIdx = raw.findIndex(
    h => h.includes('description') || h.includes('merchant') || h.includes('name') || h.includes('memo'),
  )
  const amountIdx = raw.findIndex(h => h === 'amount' || h === 'debit' || h === 'charge amount')
  const creditIdx = raw.findIndex(h => h === 'credit')

  if (dateIdx === -1 || descIdx === -1 || (amountIdx === -1 && creditIdx === -1)) {
    return {
      transactions: [],
      error: `Could not find required columns. Found: ${raw.join(', ')}. Expected: Date, Description, and Amount (or Debit/Credit).`,
    }
  }

  const transactions: Transaction[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const date = cols[dateIdx] ?? ''
    const description = cols[descIdx] ?? ''
    const rawAmount = amountIdx !== -1 ? cols[amountIdx] : cols[creditIdx]
    const amount = parseFloat((rawAmount ?? '').replace(/[$,\s]/g, ''))
    if (!date || !description) continue
    transactions.push({ date, description, amount: isNaN(amount) ? 0 : amount })
  }

  if (transactions.length === 0) {
    return { transactions: [], error: 'No transactions found after parsing.' }
  }

  return { transactions, error: '' }
}

function parseLeumiLine(text: string): Transaction | null {
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{2})/)
  if (!dateMatch) return null

  // Skip non-transaction lines
  if (/סה.?כ|לחשבון\s+\d|שיעורי ריבית|מסגרת|תוקף|התחייבויות/.test(text)) return null
  if (/תאריך\s+העסקה|שם בית העסק|סוג\s+העסקה|הערות/.test(text)) return null
  if (/מידע ובירורים|אובדן גניבה|לפרטים/.test(text)) return null
  if (/עמלת\s+מט|המרה למטבע|מטבע המקור|שעורי ריבית/.test(text)) return null
  if (/חשבונית מס|עוסק מורשה|סך העמלות/.test(text)) return null

  const date = dateMatch[1]

  // Foreign transactions have ₪-prefixed amounts
  const shekelAmounts = [...text.matchAll(/₪\s*([\d,]+\.\d{2})(?!\d)/g)]
    .map(m => parseFloat(m[1].replace(/,/g, '')))
    .filter(a => a >= 1)

  let chargeAmount: number

  if (shekelAmounts.length > 0) {
    // Foreign: largest ₪ amount includes the forex fee — that's the charge
    chargeAmount = Math.max(...shekelAmounts)
  } else {
    // Domestic: two decimal numbers appear — original price and charge amount.
    // The charge is always the smaller-or-equal value (installments < original; regular = same).
    const cleanText = text.replace(/תשלום\s+\d+\s+מתוך\s+\d+/, '')
    const amounts = [...cleanText.matchAll(/(?<![.\d])([\d,]+\.\d{2})(?!\d)/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(a => a >= 1)
    if (amounts.length === 0) return null
    chargeAmount = Math.min(...amounts)
  }

  // Build description by stripping amounts, dates, and keywords
  let desc = text
    .replace(/₪\s*[\d,]+\.\d{2}/g, '')
    .replace(/\$\s*[\d,]+\.\d{2}/g, '')
    .replace(/\d+\.\d{4,}/g, '')
    .replace(/(?<![.\d])[\d,]+\.\d{2}(?!\d)/g, '')
    .replace(/\d{2}\/\d{2}\/\d{2}/g, '')
    .replace(/(?:רגילה|תשלומים|שוטף(?:\s+רגילה)?)/g, '')
    .replace(/תשלום\s+\d+\s+מתוך\s+\d+/g, '')
    .replace(/הוראת קבע/g, '')
    .replace(/הועבר ל:[^\n]*/g, '')
    .replace(/\bILS\b\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Remove lone digit footnote markers (7, 8 etc.)
  desc = desc.replace(/(?:^|\s)\d{1,2}(?=\s|$)/g, ' ').trim()
  desc = desc.replace(/^[.,;:\s₪$]+|[.,;:\s₪$]+$/g, '').trim()

  if (!desc || desc.length < 2) return null
  return { date, description: desc, amount: chargeAmount }
}

async function parsePDF(buffer: ArrayBuffer): Promise<{ transactions: Transaction[]; error: string }> {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
    const lines: string[] = []

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const content = await page.getTextContent()

      let currentLine: string[] = []
      let currentY: number | null = null

      for (const item of content.items) {
        if (!('str' in item) || !(item as { str: string }).str.trim()) continue
        const str = (item as { str: string; transform: number[] }).str.trim()
        const y = Math.round((item as { transform: number[] }).transform[5])

        if (currentY === null || Math.abs(y - currentY) > 3) {
          if (currentLine.length) lines.push(currentLine.join(' '))
          currentLine = [str]
          currentY = y
        } else {
          currentLine.push(str)
        }
      }
      if (currentLine.length) lines.push(currentLine.join(' '))
    }

    const transactions: Transaction[] = []
    for (const line of lines) {
      const tx = parseLeumiLine(line)
      if (tx) transactions.push(tx)
    }

    if (transactions.length === 0) {
      return { transactions: [], error: 'No transactions found. Make sure this is a Bank Leumi credit card statement.' }
    }

    return { transactions, error: '' }
  } catch (err) {
    return { transactions: [], error: `PDF parsing failed: ${err}` }
  }
}

export default function BudgetUpload() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [sortField, setSortField] = useState<keyof Transaction>('date')
  const [sortAsc, setSortAsc] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.pdf')) {
      setError('Please upload a .csv or .pdf file.')
      return
    }
    setFileName(file.name)
    setError('')

    const reader = new FileReader()

    if (name.endsWith('.csv')) {
      reader.onload = e => {
        const { transactions: parsed, error: parseError } = parseCSV(e.target?.result as string)
        if (parseError) { setError(parseError); setTransactions([]) }
        else setTransactions(parsed)
      }
      reader.readAsText(file)
    } else {
      setLoading(true)
      reader.onload = async e => {
        const { transactions: parsed, error: parseError } = await parsePDF(e.target?.result as ArrayBuffer)
        setLoading(false)
        if (parseError) { setError(parseError); setTransactions([]) }
        else setTransactions(parsed)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const sortBy = (field: keyof Transaction) => {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(true) }
  }

  const sorted = [...transactions].sort((a, b) => {
    const av = a[sortField]
    const bv = b[sortField]
    const cmp = typeof av === 'number' ? (av as number) - (bv as number) : String(av).localeCompare(String(bv))
    return sortAsc ? cmp : -cmp
  })

  const charges = transactions.filter(t => t.amount > 0)
  const credits = transactions.filter(t => t.amount < 0)
  const totalCharged = charges.reduce((s, t) => s + t.amount, 0)
  const totalCredited = Math.abs(credits.reduce((s, t) => s + t.amount, 0))

  const SortIcon = ({ field }: { field: keyof Transaction }) =>
    sortField === field ? (sortAsc ? ' ↑' : ' ↓') : ''

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Budget</h2>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-6"
      >
        <input ref={inputRef} type="file" accept=".csv,.pdf" onChange={handleChange} className="hidden" />
        <div className="text-5xl mb-3">{loading ? '⏳' : '📄'}</div>
        {loading ? (
          <p className="font-medium text-gray-600">Parsing PDF...</p>
        ) : fileName ? (
          <p className="font-medium text-gray-800">{fileName}</p>
        ) : (
          <>
            <p className="font-semibold text-gray-700">Drop a file here or click to browse</p>
            <p className="text-sm text-gray-400 mt-1">
              Supports Bank Leumi PDF statements and CSV exports
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {transactions.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500 uppercase font-medium mb-1">Transactions</div>
              <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500 uppercase font-medium mb-1">Total Charged</div>
              <div className="text-2xl font-bold text-red-500">₪{totalCharged.toFixed(2)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500 uppercase font-medium mb-1">Total Credits</div>
              <div className="text-2xl font-bold text-emerald-600">₪{totalCredited.toFixed(2)}</div>
            </div>
          </div>

          <div className="overflow-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {(['date', 'description', 'amount'] as const).map(col => (
                    <th
                      key={col}
                      onClick={() => sortBy(col)}
                      className={`px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 ${col === 'amount' ? 'text-right' : 'text-left'}`}
                    >
                      {col.charAt(0).toUpperCase() + col.slice(1)}
                      <SortIcon field={col} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{t.date}</td>
                    <td className="px-4 py-2.5 text-gray-800">{t.description}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-medium tabular-nums ${
                        t.amount > 0 ? 'text-red-500' : 'text-emerald-600'
                      }`}
                    >
                      {t.amount > 0 ? '−' : '+'}₪{Math.abs(t.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
