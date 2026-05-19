'use client'

import { useState, useRef, useEffect } from 'react'

type BudgetCategory = {
  id: string
  name: string
  budgetAmount: number
  sortOrder: number
}

type ManualTransaction = {
  id: string
  date: string
  description: string
  amount: number
  categoryId: string
  isRecurring: boolean
  recurringDay: number | null
}

type Transaction = {
  date: string
  description: string
  amount: number
}

type CategorizedTransaction = Transaction & { categoryId: string }

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  rent:         ['ארנונה', 'שכ"ד', 'שכר דירה', 'ועד', 'rent', 'arnona'],
  childcare:    ['מטפלת', 'גן ילדים', 'daycare', 'childcare', 'babysit'],
  car:          ['דלק', 'פנגו', 'pango', 'ביטוח רכב', 'רישוי', 'חניה', 'parking', 'delek', 'sonol', 'pazgas', 'pal-kal'],
  electric:     ['חשמל', 'חברת חשמל', 'iec'],
  water_gas:    ['מים', 'גז', 'bezeq gas'],
  groceries:    ['שופרסל', 'רמי לוי', 'יינות', 'מגנוליה', 'אושר עד', 'victory', 'shufersal', 'supermarket', 'מרקט', 'סופרמרקט'],
  kids_school:  ['חוג', 'בית ספר', 'school', 'צעצוע', 'ספרים', 'chug', 'kinder'],
  health:       ['מכבי', 'קופת חולים', 'super-pharm', 'superpharm', 'super pharm', 'pharmacy', 'בית מרקחת', 'dental', 'שיניים'],
  phones:       ['סלקום', 'cellcom', 'פרטנר', 'partner', 'hot ', 'yes ', 'בזק', 'bezeq', 'netflix', 'spotify', 'apple.com', 'google', '012', 'golan'],
  eating_out:   ['מסעדה', 'קפה', 'restaurant', 'cafe', 'coffee', 'wolt', 'ten bis', '10bis', 'pizza', 'פיצה', 'sushi', 'סושי', 'burger', 'mcdonalds'],
  clothing:     ['זארה', 'zara', 'h&m', 'clothing', 'נעל', 'castro', 'renuar', 'golf', 'fox '],
  holidays:     ['מתנה', 'gift', 'חנוכה', 'פסח', 'holiday', 'synagogue', 'בית כנסת', 'חג', 'ראש השנה'],
  emergency:    [],
  house_savings:['savings', 'investment', 'העברה', 'חסכון'],
}

function categorize(description: string): string {
  const lower = description.toLowerCase()
  for (const [catId, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.length > 0 && kws.some(kw => lower.includes(kw.toLowerCase()))) return catId
  }
  return ''
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): { transactions: Transaction[]; error: string } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { transactions: [], error: 'File appears empty.' }

  const raw = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())
  const dateIdx   = raw.findIndex(h => h.includes('date'))
  const descIdx   = raw.findIndex(h => h.includes('description') || h.includes('merchant') || h.includes('name') || h.includes('memo'))
  const amountIdx = raw.findIndex(h => h === 'amount' || h === 'debit' || h === 'charge amount')
  const creditIdx = raw.findIndex(h => h === 'credit')

  if (dateIdx === -1 || descIdx === -1 || (amountIdx === -1 && creditIdx === -1)) {
    return { transactions: [], error: `Could not find required columns. Found: ${raw.join(', ')}` }
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

  return transactions.length === 0
    ? { transactions: [], error: 'No transactions found after parsing.' }
    : { transactions, error: '' }
}

// ── PDF parser (Bank Leumi) ───────────────────────────────────────────────────

function parseLeumiLine(text: string): Transaction | null {
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{2})/)
  if (!dateMatch) return null

  if (/סה.?כ|לחשבון\s+\d|שיעורי ריבית|מסגרת|תוקף|התחייבויות/.test(text)) return null
  if (/תאריך\s+העסקה|שם בית העסק|סוג\s+העסקה|הערות/.test(text)) return null
  if (/מידע ובירורים|אובדן גניבה|לפרטים/.test(text)) return null
  if (/עמלת\s+מט|המרה למטבע|מטבע המקור|שעורי ריבית/.test(text)) return null
  if (/חשבונית מס|עוסק מורשה|סך העמלות/.test(text)) return null

  const date = dateMatch[1]
  const shekelAmounts = [...text.matchAll(/₪\s*([\d,]+\.\d{2})(?!\d)/g)]
    .map(m => parseFloat(m[1].replace(/,/g, '')))
    .filter(a => a >= 1)

  let chargeAmount: number
  if (shekelAmounts.length > 0) {
    chargeAmount = Math.max(...shekelAmounts)
  } else {
    const cleanText = text.replace(/תשלום\s+\d+\s+מתוך\s+\d+/, '')
    const amounts = [...cleanText.matchAll(/(?<![.\d])([\d,]+\.\d{2})(?!\d)/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(a => a >= 1)
    if (amounts.length === 0) return null
    chargeAmount = Math.min(...amounts)
  }

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

    const transactions = lines.map(parseLeumiLine).filter((t): t is Transaction => t !== null)
    if (transactions.length === 0) {
      return { transactions: [], error: 'No transactions found. Make sure this is a Bank Leumi credit card statement.' }
    }
    return { transactions, error: '' }
  } catch (err) {
    return { transactions: [], error: `PDF parsing failed: ${err}` }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  date: '',
  description: '',
  amount: '',
  categoryId: '',
  isRecurring: false,
  recurringDay: '',
}

export default function BudgetDashboard() {
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [manualTxns, setManualTxns] = useState<ManualTransaction[]>([])
  const [ccTxns, setCcTxns] = useState<CategorizedTransaction[]>([])
  const [editingBudget, setEditingBudget] = useState(false)
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({})
  const [uploadError, setUploadError] = useState('')
  const [fileName, setFileName] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/budget/categories').then(r => r.json()),
      fetch('/api/budget/transactions').then(r => r.json()),
    ]).then(([cats, txns]) => {
      setCategories(cats)
      setManualTxns(txns)
    })
  }, [])

  const todayDay = new Date().getDate()

  function getSpent(catId: string): number {
    const fromManual = manualTxns
      .filter(t => t.categoryId === catId)
      .filter(t => !t.isRecurring || (t.recurringDay !== null && t.recurringDay <= todayDay))
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const fromCC = ccTxns
      .filter(t => t.categoryId === catId && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
    return fromManual + fromCC
  }

  const handleFile = (file: File) => {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.pdf')) {
      setUploadError('Please upload a .csv or .pdf file.')
      return
    }
    setFileName(file.name)
    setUploadError('')
    const reader = new FileReader()
    if (name.endsWith('.csv')) {
      reader.onload = e => {
        const { transactions: parsed, error } = parseCSV(e.target?.result as string)
        if (error) { setUploadError(error); setCcTxns([]) }
        else setCcTxns(parsed.map(t => ({ ...t, categoryId: categorize(t.description) })))
      }
      reader.readAsText(file)
    } else {
      setUploadLoading(true)
      reader.onload = async e => {
        const { transactions: parsed, error } = await parsePDF(e.target?.result as ArrayBuffer)
        setUploadLoading(false)
        if (error) { setUploadError(error); setCcTxns([]) }
        else setCcTxns(parsed.map(t => ({ ...t, categoryId: categorize(t.description) })))
      }
      reader.readAsArrayBuffer(file)
    }
  }

  async function saveTransaction() {
    if (!form.description.trim() || !form.amount || !form.categoryId) return
    setSaving(true)
    const txn: ManualTransaction = {
      id: crypto.randomUUID(),
      date: form.date,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      categoryId: form.categoryId,
      isRecurring: form.isRecurring,
      recurringDay: form.isRecurring && form.recurringDay ? parseInt(form.recurringDay) : null,
    }
    await fetch('/api/budget/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txn),
    })
    setManualTxns(prev => [txn, ...prev])
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] })
    setShowAddForm(false)
    setSaving(false)
  }

  async function deleteTransaction(id: string) {
    await fetch(`/api/budget/transactions/${id}`, { method: 'DELETE' })
    setManualTxns(prev => prev.filter(t => t.id !== id))
  }

  function startEditBudget() {
    const amounts: Record<string, string> = {}
    categories.forEach(c => { amounts[c.id] = String(c.budgetAmount) })
    setEditAmounts(amounts)
    setEditingBudget(true)
  }

  async function saveBudgetAmounts() {
    const updates = Object.entries(editAmounts).map(([id, val]) => ({ id, budgetAmount: parseFloat(val) || 0 }))
    await fetch('/api/budget/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setCategories(prev =>
      prev.map(cat => editAmounts[cat.id] !== undefined ? { ...cat, budgetAmount: parseFloat(editAmounts[cat.id]) || 0 } : cat)
    )
    setEditingBudget(false)
    setEditAmounts({})
  }

  const totalBudget = categories.reduce((s, c) => s + c.budgetAmount, 0)
  const totalSpent  = categories.reduce((s, c) => s + getSpent(c.id), 0)
  const totalLeft   = totalBudget - totalSpent

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Budget</h2>

      {/* ── Budget Overview ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Monthly Overview</h3>
          {!editingBudget && (
            <button onClick={startEditBudget} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ⚙ Edit Amounts
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {categories.map(cat => {
            const spent = getSpent(cat.id)
            const budget = editingBudget
              ? parseFloat(editAmounts[cat.id] ?? String(cat.budgetAmount)) || 0
              : cat.budgetAmount
            const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
            const remaining = budget - spent
            const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'

            return (
              <div key={cat.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <div className="text-xs font-medium text-gray-600 mb-2 leading-tight">{cat.name}</div>
                {editingBudget ? (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-sm">₪</span>
                    <input
                      type="number"
                      value={editAmounts[cat.id] ?? cat.budgetAmount}
                      onChange={e => setEditAmounts(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      className="w-full text-sm border border-blue-300 rounded px-1.5 py-0.5 font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">₪{spent.toLocaleString()}</span>
                      <span className={remaining < 0 ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                        {remaining < 0
                          ? `−₪${Math.abs(remaining).toLocaleString()} over`
                          : `₪${remaining.toLocaleString()} left`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1.5">of ₪{cat.budgetAmount.toLocaleString()}</div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {editingBudget ? (
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setEditingBudget(false); setEditAmounts({}) }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveBudgetAmounts}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Amounts
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm">
            <div>
              <span className="text-gray-500">Budget </span>
              <span className="font-semibold text-gray-900">₪{totalBudget.toLocaleString()}</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div>
              <span className="text-gray-500">Spent </span>
              <span className="font-semibold text-gray-900">₪{totalSpent.toLocaleString()}</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div>
              <span className="text-gray-500">Remaining </span>
              <span className={`font-semibold ${totalLeft < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ₪{totalLeft.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── CC Statement Upload ── */}
      <section className="mb-10">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Credit Card Statement</h3>

        <div
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-4"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.pdf"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            className="hidden"
          />
          <div className="text-4xl mb-2">{uploadLoading ? '⏳' : '📄'}</div>
          {uploadLoading ? (
            <p className="font-medium text-gray-600">Parsing PDF...</p>
          ) : fileName ? (
            <p className="font-medium text-gray-800">{fileName}</p>
          ) : (
            <>
              <p className="font-semibold text-gray-700">Drop a file here or click to browse</p>
              <p className="text-sm text-gray-400 mt-1">Supports Bank Leumi PDF statements and CSV exports</p>
            </>
          )}
        </div>

        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {uploadError}
          </div>
        )}

        {ccTxns.length > 0 && (
          <div className="overflow-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Description</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Amount</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ccTxns.map((t, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${!t.categoryId ? 'bg-amber-50' : ''}`}>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{t.date}</td>
                    <td className="px-3 py-2 text-gray-800">{t.description}</td>
                    <td className={`px-3 py-2 text-right font-medium tabular-nums ${t.amount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {t.amount > 0 ? '−' : '+'}₪{Math.abs(t.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={t.categoryId}
                        onChange={e => setCcTxns(prev => prev.map((tx, j) => j === i ? { ...tx, categoryId: e.target.value } : tx))}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">— Uncategorized —</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Manual Transactions ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Manual Transactions</h3>
          <button
            onClick={() => setShowAddForm(f => !f)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Transaction
          </button>
        </div>

        {showAddForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₪)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Rent payment"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked, recurringDay: '' }))}
                    className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                  />
                  Recurring monthly
                </label>
                {form.isRecurring && (
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Day of month (1–31)"
                    value={form.recurringDay}
                    onChange={e => setForm(f => ({ ...f, recurringDay: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveTransaction}
                disabled={saving || !form.description.trim() || !form.amount || !form.categoryId}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {manualTxns.length === 0 && !showAddForm ? (
          <p className="text-sm text-gray-400 text-center py-8">No manual transactions yet. Add recurring payments like rent or one-off expenses.</p>
        ) : manualTxns.length > 0 && (
          <div className="overflow-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Date / Schedule</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Description</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Amount</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Category</th>
                  <th className="px-3 py-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {manualTxns.map(t => {
                  const catName = categories.find(c => c.id === t.categoryId)?.name ?? t.categoryId
                  const isActiveRecurring = t.isRecurring && t.recurringDay !== null && t.recurringDay <= todayDay
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {t.isRecurring ? (
                          <span className="flex items-center gap-1.5">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${isActiveRecurring ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            {t.recurringDay ? `Every ${t.recurringDay}${ordinal(t.recurringDay)}` : 'Monthly'}
                          </span>
                        ) : t.date}
                      </td>
                      <td className="px-3 py-2 text-gray-800">{t.description}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-red-500">
                        ₪{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{catName}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => deleteTransaction(t.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}
