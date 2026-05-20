'use client'

import { useState, useRef, useEffect } from 'react'
import ChugimTab from './ChugimTab'
import TransactionsTab from './TransactionsTab'
import SavingsTab from './SavingsTab'

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
  chugId: string | null
  recurringInterval: string
  recurringStartMonth: string | null
}

type Transaction = {
  date: string
  description: string
  amount: number
}

type CategorizedTransaction = Transaction & { categoryId: string }

type CcTransaction = {
  id: string
  date: string
  description: string
  amount: number
  categoryId: string
  month: string
}

type AnalyticsData = {
  monthlyTotals: { month: string; total: number }[]
  topVendors: { description: string; total: number }[]
}

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

function categorize(description: string, mappings: Record<string, string> = {}): string {
  if (mappings[description]) return mappings[description]
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

// ── Per-category color palette ────────────────────────────────────────────────

const CAT_STYLES = [
  { card: 'from-purple-50  to-purple-100',  border: 'border-purple-200',  label: 'text-purple-700',  bar: 'linear-gradient(90deg,#7C3AED,#A855F7)' },
  { card: 'from-pink-50    to-pink-100',    border: 'border-pink-200',    label: 'text-pink-700',    bar: 'linear-gradient(90deg,#EC4899,#F43F5E)' },
  { card: 'from-amber-50   to-amber-100',   border: 'border-amber-200',   label: 'text-amber-700',   bar: 'linear-gradient(90deg,#F59E0B,#EF4444)' },
  { card: 'from-sky-50     to-sky-100',     border: 'border-sky-200',     label: 'text-sky-700',     bar: 'linear-gradient(90deg,#0EA5E9,#6366F1)' },
  { card: 'from-teal-50    to-teal-100',    border: 'border-teal-200',    label: 'text-teal-700',    bar: 'linear-gradient(90deg,#14B8A6,#10B981)' },
  { card: 'from-indigo-50  to-indigo-100',  border: 'border-indigo-200',  label: 'text-indigo-700',  bar: 'linear-gradient(90deg,#6366F1,#8B5CF6)' },
  { card: 'from-rose-50    to-rose-100',    border: 'border-rose-200',    label: 'text-rose-700',    bar: 'linear-gradient(90deg,#F43F5E,#EC4899)' },
  { card: 'from-lime-50    to-lime-100',    border: 'border-lime-200',    label: 'text-lime-700',    bar: 'linear-gradient(90deg,#84CC16,#22C55E)' },
  { card: 'from-orange-50  to-orange-100',  border: 'border-orange-200',  label: 'text-orange-700',  bar: 'linear-gradient(90deg,#F97316,#EF4444)' },
  { card: 'from-cyan-50    to-cyan-100',    border: 'border-cyan-200',    label: 'text-cyan-700',    bar: 'linear-gradient(90deg,#06B6D4,#0EA5E9)' },
  { card: 'from-violet-50  to-violet-100',  border: 'border-violet-200',  label: 'text-violet-700',  bar: 'linear-gradient(90deg,#8B5CF6,#7C3AED)' },
  { card: 'from-fuchsia-50 to-fuchsia-100', border: 'border-fuchsia-200', label: 'text-fuchsia-700', bar: 'linear-gradient(90deg,#D946EF,#A21CAF)' },
  { card: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', label: 'text-emerald-700', bar: 'linear-gradient(90deg,#10B981,#059669)' },
  { card: 'from-yellow-50  to-yellow-100',  border: 'border-yellow-200',  label: 'text-yellow-700',  bar: 'linear-gradient(90deg,#EAB308,#F59E0B)' },
]

const EMPTY_FORM = {
  date: '',
  description: '',
  amount: '',
  categoryId: '',
  isRecurring: false,
  recurringDay: '',
  recurringInterval: 'monthly' as 'monthly' | 'bimonthly',
  recurringStartMonth: '',
}

// ── Spending bar chart (SVG, no deps) ─────────────────────────────────────────

function SpendingChart({ data, budget }: { data: { month: string; total: number }[]; budget: number }) {
  const W = 360, H = 170, padL = 42, padB = 28, padT = 20, padR = 10
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const maxVal = Math.max(...data.map(d => d.total), budget, 1)
  const barW = (plotW / data.length) * 0.6
  const gap = plotW / data.length
  const budgetY = padT + plotH * (1 - budget / maxVal)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="spendPurple" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="spendRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCA5A5" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.5, 1].map(pct => (
        <line
          key={pct}
          x1={padL} y1={padT + plotH * (1 - pct)}
          x2={W - padR} y2={padT + plotH * (1 - pct)}
          stroke="#F3F4F6" strokeWidth="1"
        />
      ))}

      {/* Y axis labels */}
      {[0, 0.5, 1].map(pct => (
        <text key={pct} x={padL - 4} y={padT + plotH * (1 - pct) + 4}
          textAnchor="end" fontSize="9" fill="#9CA3AF" fontFamily="sans-serif">
          {pct === 0 ? '0' : `₪${Math.round(maxVal * pct / 1000)}k`}
        </text>
      ))}

      {/* Budget dashed line */}
      {budget > 0 && (
        <>
          <line x1={padL} y1={budgetY} x2={W - padR} y2={budgetY}
            stroke="#7C3AED" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.6" />
          <text x={W - padR - 2} y={budgetY - 4} textAnchor="end"
            fontSize="8" fill="#7C3AED" fontFamily="sans-serif" opacity="0.8">budget</text>
        </>
      )}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = Math.max((d.total / maxVal) * plotH, d.total > 0 ? 2 : 0)
        const x = padL + i * gap + (gap - barW) / 2
        const y = padT + plotH - barH
        const over = budget > 0 && d.total > budget
        return (
          <g key={d.month}>
            <rect x={x} y={y} width={barW} height={barH} rx="3"
              fill={over ? 'url(#spendRed)' : 'url(#spendPurple)'} opacity="0.9" />
            {d.total > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                fontSize="9" fill="#374151" fontFamily="sans-serif" fontWeight="600">
                {d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : Math.round(d.total)}
              </text>
            )}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle"
              fontSize="9" fill="#9CA3AF" fontFamily="sans-serif">
              {d.month.slice(5)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BudgetDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'chugim' | 'transactions' | 'savings'>('overview')
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [manualTxns, setManualTxns] = useState<ManualTransaction[]>([])
  const [ccTxns, setCcTxns] = useState<CategorizedTransaction[]>([])
  const [savedCcTxns, setSavedCcTxns] = useState<CcTransaction[]>([])
  const [descriptionMappings, setDescriptionMappings] = useState<Record<string, string>>({})
  const mappingsRef = useRef<Record<string, string>>({})

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const currentMonth = new Date().toISOString().slice(0, 7)
  const todayDay = new Date().getDate()
  const isCurrentMonth = selectedMonth === currentMonth

  const [editingBudget, setEditingBudget] = useState(false)
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({})

  const [uploadError, setUploadError] = useState('')
  const [fileName, setFileName] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [savingCc, setSavingCc] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] })
  const inputRef = useRef<HTMLInputElement>(null)
  const addFormRef = useRef<HTMLElement>(null)

  const [analyticsModal, setAnalyticsModal] = useState<string | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Keep mappings ref in sync to avoid stale closures in file handlers
  useEffect(() => { mappingsRef.current = descriptionMappings }, [descriptionMappings])

  // Initial load
  useEffect(() => {
    Promise.all([
      fetch('/api/budget/categories').then(r => r.json()),
      fetch('/api/budget/transactions').then(r => r.json()),
      fetch('/api/budget/description-mappings').then(r => r.json()),
    ]).then(([cats, txns, mappingRows]) => {
      setCategories(cats)
      setManualTxns(txns)
      const m: Record<string, string> = {}
      for (const row of mappingRows) m[row.description] = row.categoryId
      setDescriptionMappings(m)
    })
  }, [])

  // Reload CC transactions whenever month changes
  useEffect(() => {
    fetch(`/api/budget/cc-transactions?month=${selectedMonth}`)
      .then(r => r.json())
      .then(setSavedCcTxns)
  }, [selectedMonth])

  // Load analytics when modal opens
  useEffect(() => {
    if (!analyticsModal) { setAnalyticsData(null); return }
    setAnalyticsLoading(true)
    fetch(`/api/budget/analytics/${analyticsModal}`)
      .then(r => r.json())
      .then(data => { setAnalyticsData(data); setAnalyticsLoading(false) })
      .catch(() => setAnalyticsLoading(false))
  }, [analyticsModal])

  // Close analytics modal on Escape
  useEffect(() => {
    if (!analyticsModal) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setAnalyticsModal(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [analyticsModal])

  function navigateMonth(dir: 1 | -1) {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + dir, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(next)
    setCcTxns([])
    setFileName('')
    setUploadError('')
  }

  function formatMonth(month: string): string {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  function getSpent(catId: string): number {
    const fromManualOneOff = manualTxns
      .filter(t => !t.isRecurring && t.date.startsWith(selectedMonth) && t.categoryId === catId)
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const fromManualRecurring = manualTxns
      .filter(t => t.isRecurring && t.categoryId === catId)
      .filter(t => {
        if (isCurrentMonth && (t.recurringDay === null || t.recurringDay > todayDay)) return false
        if (t.recurringStartMonth && selectedMonth < t.recurringStartMonth) return false
        if (t.recurringInterval === 'bimonthly' && t.recurringStartMonth) {
          const [sy, sm] = t.recurringStartMonth.split('-').map(Number)
          const [ty, tm] = selectedMonth.split('-').map(Number)
          const diff = (ty - sy) * 12 + (tm - sm)
          if (diff % 2 !== 0) return false
        }
        return true
      })
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const fromSavedCC = savedCcTxns
      .filter(t => t.categoryId === catId && Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const fromUploadedCC = ccTxns
      .filter(t => t.categoryId === catId && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    return fromManualOneOff + fromManualRecurring + fromSavedCC + fromUploadedCC
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
        else setCcTxns(parsed.map(t => ({ ...t, categoryId: categorize(t.description, mappingsRef.current) })))
      }
      reader.readAsText(file)
    } else {
      setUploadLoading(true)
      reader.onload = async e => {
        const { transactions: parsed, error } = await parsePDF(e.target?.result as ArrayBuffer)
        setUploadLoading(false)
        if (error) { setUploadError(error); setCcTxns([]) }
        else setCcTxns(parsed.map(t => ({ ...t, categoryId: categorize(t.description, mappingsRef.current) })))
      }
      reader.readAsArrayBuffer(file)
    }
  }

  async function handleCategoryChange(idx: number, newCategoryId: string) {
    const description = ccTxns[idx].description
    setCcTxns(prev => prev.map((t, j) => j === idx ? { ...t, categoryId: newCategoryId } : t))
    if (newCategoryId) {
      setDescriptionMappings(prev => ({ ...prev, [description]: newCategoryId }))
      await fetch('/api/budget/description-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, categoryId: newCategoryId }),
      })
    }
  }

  async function saveCcTransactions() {
    if (ccTxns.length === 0) return
    setSavingCc(true)
    const transactions = ccTxns.map(t => ({
      id: crypto.randomUUID(),
      date: t.date,
      description: t.description,
      amount: t.amount,
      categoryId: t.categoryId,
    }))
    await fetch('/api/budget/cc-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: selectedMonth, transactions }),
    })
    setSavedCcTxns(transactions.map(t => ({ ...t, month: selectedMonth })))
    setCcTxns([])
    setFileName('')
    setSavingCc(false)
  }

  function openAddFormWithCategory(categoryId: string) {
    const defaultDate = isCurrentMonth
      ? new Date().toISOString().split('T')[0]
      : `${selectedMonth}-01`
    setForm(f => ({ ...f, categoryId, date: defaultDate }))
    setShowAddForm(true)
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
      chugId: null,
      recurringInterval: form.recurringInterval,
      recurringStartMonth: form.isRecurring && form.recurringStartMonth ? form.recurringStartMonth : null,
    }
    await fetch('/api/budget/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...txn,
        recurringInterval: txn.recurringInterval,
        recurringStartMonth: txn.recurringStartMonth,
      }),
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

  const analyticsCategory = analyticsModal ? categories.find(c => c.id === analyticsModal) : null
  const analyticsCatIdx   = analyticsModal ? categories.findIndex(c => c.id === analyticsModal) : 0
  const analyticsStyle    = CAT_STYLES[analyticsCatIdx % CAT_STYLES.length]

  const inputCls = "w-full border-2 border-violet-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80"

  // Filtered manual transactions for the selected month view
  const visibleManualTxns = manualTxns.filter(t =>
    t.isRecurring || t.date.startsWith(selectedMonth)
  )

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto animate-slide-up">

      <h2
        className="text-3xl font-black mb-4"
        style={{
          background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        💰 Budget
      </h2>

      {/* ── Tab bar ── */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'overview',      label: '📊 Overview',     gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)' },
          { key: 'chugim',        label: '🎽 Chugim',       gradient: 'linear-gradient(135deg, #7C3AED, #EC4899)' },
          { key: 'transactions',  label: '📋 Transactions', gradient: 'linear-gradient(135deg, #0EA5E9, #6366F1)' },
          { key: 'savings',       label: '🏠 Savings',      gradient: 'linear-gradient(135deg, #10B981, #059669)' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold rounded-full transition-all duration-200 ${
              activeTab === tab.key
                ? 'text-white shadow-lg scale-105'
                : 'text-gray-500 hover:text-gray-800 hover:bg-white/70 hover:scale-105'
            }`}
            style={activeTab === tab.key ? { background: tab.gradient, boxShadow: '0 4px 15px rgba(0,0,0,0.15)' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'chugim' && <ChugimTab />}
      {activeTab === 'transactions' && <TransactionsTab categories={categories} />}
      {activeTab === 'savings' && <SavingsTab />}

      {activeTab === 'overview' && <>

      {/* ── Month selector + Overview ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateMonth(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-violet-500 hover:bg-violet-100 font-black text-lg transition-colors"
            >‹</button>
            <span className="text-base font-black text-gray-700 min-w-[160px] text-center">
              {formatMonth(selectedMonth)}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              disabled={selectedMonth >= currentMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full text-violet-500 hover:bg-violet-100 font-black text-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >›</button>
          </div>
          {!editingBudget && (
            <button
              onClick={startEditBudget}
              className="text-xs font-bold text-violet-500 hover:text-violet-700 transition-colors px-3 py-1.5 rounded-full hover:bg-violet-50"
            >
              ⚙ Edit Amounts
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {categories.map((cat, idx) => {
            const style = CAT_STYLES[idx % CAT_STYLES.length]
            const spent = getSpent(cat.id)
            const budget = editingBudget
              ? parseFloat(editAmounts[cat.id] ?? String(cat.budgetAmount)) || 0
              : cat.budgetAmount
            const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
            const remaining = budget - spent
            const barGradient = pct >= 100
              ? 'linear-gradient(90deg,#EF4444,#DC2626)'
              : pct >= 80
              ? 'linear-gradient(90deg,#F59E0B,#EAB308)'
              : style.bar

            return (
              <div
                key={cat.id}
                onClick={() => !editingBudget && setAnalyticsModal(cat.id)}
                className={`bg-gradient-to-br ${style.card} border ${style.border} rounded-2xl p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${!editingBudget ? 'cursor-pointer' : ''}`}
              >
                <div className={`text-xs font-black mb-2 leading-tight ${style.label}`}>
                  {cat.name}
                </div>
                {editingBudget ? (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-sm font-bold">₪</span>
                    <input
                      type="number"
                      value={editAmounts[cat.id] ?? cat.budgetAmount}
                      onChange={e => setEditAmounts(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      className="w-full text-sm border-2 border-violet-300 rounded-lg px-1.5 py-0.5 font-bold focus:outline-none focus:border-violet-500 bg-white/80"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-xs mb-1 font-semibold">
                      <span className="text-gray-600">₪{spent.toLocaleString()}</span>
                      <span className={remaining < 0 ? 'text-red-500 font-black' : 'text-gray-500'}>
                        {remaining < 0
                          ? `−₪${Math.abs(remaining).toLocaleString()}`
                          : `₪${remaining.toLocaleString()} left`}
                      </span>
                    </div>
                    <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: barGradient }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="text-xs text-gray-400 font-semibold">
                        of ₪{cat.budgetAmount.toLocaleString()}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); openAddFormWithCategory(cat.id) }}
                        className={`text-xs font-black px-1.5 py-0.5 rounded-lg transition-colors ${style.label} hover:bg-white/60`}
                        title="Add transaction"
                      >
                        + Add
                      </button>
                    </div>
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
              className="px-4 py-2 text-sm font-bold border-2 border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={saveBudgetAmounts}
              className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
            >
              Save Amounts
            </button>
          </div>
        ) : (
          /* ── Monthly Summary Card ── */
          <div
            className="rounded-2xl px-5 py-4 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)' }}
          >
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-xs font-black text-gray-400 uppercase tracking-wide mb-0.5">Budget</div>
                <div className="font-black text-gray-800 text-base">₪{totalBudget.toLocaleString()}</div>
              </div>
              <div className="w-px h-8 bg-pink-200" />
              <div className="text-center">
                <div className="text-xs font-black text-gray-400 uppercase tracking-wide mb-0.5">Spent</div>
                <div className="font-black text-amber-600 text-base">₪{totalSpent.toLocaleString()}</div>
              </div>
              <div className="w-px h-8 bg-pink-200" />
              <div className="text-center">
                <div className="text-xs font-black text-gray-400 uppercase tracking-wide mb-0.5">
                  {totalLeft < 0 ? 'Over Budget' : 'Remaining'}
                </div>
                <div className={`font-black text-base ${totalLeft < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {totalLeft < 0 ? `−₪${Math.abs(totalLeft).toLocaleString()}` : `₪${totalLeft.toLocaleString()}`}
                </div>
              </div>
            </div>
            {/* Big difference indicator */}
            <div className={`mt-3 pt-3 border-t ${totalLeft < 0 ? 'border-red-100' : 'border-emerald-100'} text-center`}>
              <span className={`text-2xl font-black ${totalLeft < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {totalLeft < 0 ? `−₪${Math.abs(totalLeft).toLocaleString()}` : `+₪${totalLeft.toLocaleString()}`}
              </span>
              <span className="text-xs font-semibold text-gray-400 ml-2">
                {totalLeft < 0 ? 'over budget this month' : 'under budget this month'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── CC Statement Upload ── */}
      <section className="mb-10">
        <h3 className="text-lg font-black text-gray-700 mb-4">💳 Credit Card Statement</h3>

        <div
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 hover:scale-[1.01] mb-4 border-2 border-dashed border-violet-300"
          style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8, #fff7ed)' }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.pdf"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            className="hidden"
          />
          <div className="text-5xl mb-3">{uploadLoading ? '⏳' : '📄'}</div>
          {uploadLoading ? (
            <p className="font-black text-violet-600">Parsing PDF...</p>
          ) : fileName ? (
            <p className="font-black text-gray-700">{fileName}</p>
          ) : (
            <>
              <p className="font-black text-gray-700 text-base">Drop a file here or click to browse</p>
              <p className="text-sm text-gray-400 font-semibold mt-1">
                Supports Bank Leumi PDF statements and CSV exports
              </p>
            </>
          )}
        </div>

        {uploadError && (
          <div className="mb-4 p-3.5 bg-red-50 border-2 border-red-200 rounded-xl text-sm font-semibold text-red-600">
            {uploadError}
          </div>
        )}

        {savedCcTxns.length > 0 && ccTxns.length === 0 && (
          <div className="mb-3 px-4 py-2 bg-violet-50 border border-violet-200 rounded-xl text-xs font-semibold text-violet-600">
            {savedCcTxns.length} transactions saved for {formatMonth(selectedMonth)}
          </div>
        )}

        {ccTxns.length > 0 && (
          <>
            <div className="overflow-auto rounded-2xl border border-violet-100 shadow-md mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
                    <th className="px-3 py-3 text-left font-black text-white">Date</th>
                    <th className="px-3 py-3 text-left font-black text-white">Description</th>
                    <th className="px-3 py-3 text-right font-black text-white">Amount</th>
                    <th className="px-3 py-3 text-left font-black text-white">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50">
                  {ccTxns.map((t, i) => (
                    <tr key={i} className={`transition-colors ${!t.categoryId ? 'bg-amber-50' : 'hover:bg-violet-50/40'}`}>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap font-semibold">{t.date}</td>
                      <td className="px-3 py-2.5 text-gray-700 font-semibold">{t.description}</td>
                      <td className={`px-3 py-2.5 text-right font-black tabular-nums ${t.amount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {t.amount > 0 ? '−' : '+'}₪{Math.abs(t.amount).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={t.categoryId}
                          onChange={e => handleCategoryChange(i, e.target.value)}
                          className="text-xs border-2 border-violet-200 rounded-lg px-1.5 py-0.5 font-semibold text-gray-700 bg-white focus:outline-none focus:border-violet-400"
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
            <div className="flex justify-end">
              <button
                onClick={saveCcTransactions}
                disabled={savingCc}
                className="px-5 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-50 disabled:scale-100"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
              >
                {savingCc ? 'Saving…' : `💾 Save to ${formatMonth(selectedMonth)}`}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ── Manual Transactions ── */}
      <section ref={addFormRef}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-700">📝 Manual Transactions</h3>
          <button
            onClick={() => {
              const defaultDate = isCurrentMonth
                ? new Date().toISOString().split('T')[0]
                : `${selectedMonth}-01`
              setForm(f => ({ ...f, date: defaultDate }))
              setShowAddForm(f => !f)
            }}
            className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
          >
            + Add Transaction
          </button>
        </div>

        {showAddForm && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddForm(false)}
          >
          <div
            className="w-full max-w-lg rounded-2xl p-5 shadow-2xl animate-bounce-in max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(135deg, #fffbeb, #fff7ed)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Amount (₪)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Rent payment"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Category</label>
                <select
                  value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked, recurringDay: '' }))}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#7C3AED' }}
                  />
                  Recurring
                </label>
                {form.isRecurring && (
                  <div className="flex flex-col gap-2">
                    <div className="flex rounded-lg border-2 border-violet-200 overflow-hidden text-xs">
                      {(['monthly', 'bimonthly'] as const).map(iv => (
                        <button
                          key={iv}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, recurringInterval: iv }))}
                          className={`flex-1 py-1 font-black transition-colors ${form.recurringInterval === iv ? 'text-white' : 'text-gray-500 hover:bg-violet-50'}`}
                          style={form.recurringInterval === iv ? { background: 'linear-gradient(135deg,#7C3AED,#A855F7)' } : {}}
                        >
                          {iv === 'monthly' ? 'Monthly' : 'Bi-monthly'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Day of month (1–31)"
                      value={form.recurringDay}
                      onChange={e => setForm(f => ({ ...f, recurringDay: e.target.value }))}
                      className={inputCls}
                    />
                    <input
                      type="month"
                      placeholder="Start month (optional)"
                      value={form.recurringStartMonth}
                      onChange={e => setForm(f => ({ ...f, recurringStartMonth: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-bold border-2 border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveTransaction}
                disabled={saving || !form.description.trim() || !form.amount || !form.categoryId}
                className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
          </div>
        )}

        {visibleManualTxns.length === 0 && !showAddForm ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3 animate-float">📝</div>
            <p className="text-sm font-bold text-gray-400">No manual transactions yet.</p>
            <p className="text-xs text-gray-300 mt-1">Add recurring payments like rent or one-off expenses.</p>
          </div>
        ) : visibleManualTxns.length > 0 && (
          <div className="overflow-auto rounded-2xl border border-amber-100 shadow-md">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #F59E0B, #F97316)' }}>
                  <th className="px-3 py-3 text-left font-black text-white">Date / Schedule</th>
                  <th className="px-3 py-3 text-left font-black text-white">Description</th>
                  <th className="px-3 py-3 text-right font-black text-white">Amount</th>
                  <th className="px-3 py-3 text-left font-black text-white">Category</th>
                  <th className="px-3 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {visibleManualTxns.map(t => {
                  const catName = categories.find(c => c.id === t.categoryId)?.name ?? t.categoryId
                  const isActiveRecurring = t.isRecurring && t.recurringDay !== null && (!isCurrentMonth || t.recurringDay <= todayDay)
                  return (
                    <tr key={t.id} className="hover:bg-amber-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap font-semibold">
                        {t.isRecurring ? (
                          <span className="flex items-center gap-1.5">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ background: isActiveRecurring ? 'linear-gradient(135deg,#10B981,#059669)' : '#D1D5DB' }}
                            />
                            <span>
                              {t.recurringDay ? `Every ${t.recurringDay}${ordinal(t.recurringDay)}` : 'Monthly'}
                              {t.recurringInterval === 'bimonthly' && (
                                <span className="ml-1 text-[10px] font-black text-violet-500 bg-violet-50 px-1 rounded">2mo</span>
                              )}
                              {t.recurringStartMonth && (
                                <span className="ml-1 text-[10px] text-gray-400">from {t.recurringStartMonth}</span>
                              )}
                            </span>
                          </span>
                        ) : t.date}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 font-semibold">{t.description}</td>
                      <td className="px-3 py-2.5 text-right font-black tabular-nums text-red-500">
                        ₪{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 font-semibold">{catName}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => deleteTransaction(t.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
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

      </>}

      {/* ── Analytics Modal ── */}
      {analyticsModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setAnalyticsModal(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className={`rounded-t-3xl px-6 py-5 bg-gradient-to-br ${analyticsStyle.card} border-b ${analyticsStyle.border}`}>
              <div className="flex justify-between items-center">
                <div>
                  <div className={`text-xs font-black uppercase tracking-wide ${analyticsStyle.label} opacity-60`}>
                    Category Trends
                  </div>
                  <div className="text-xl font-black text-gray-800 mt-0.5">
                    {analyticsCategory?.name}
                  </div>
                </div>
                <button
                  onClick={() => setAnalyticsModal(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/60 text-xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6">
              {analyticsLoading ? (
                <div className="text-center py-12 text-gray-400 font-semibold">
                  <div className="text-4xl mb-3">📊</div>
                  Loading trends…
                </div>
              ) : analyticsData ? (
                <>
                  {/* Bar chart */}
                  <div className="mb-6">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-wide mb-3">
                      6-Month Spending Trend
                    </div>
                    <SpendingChart
                      data={analyticsData.monthlyTotals}
                      budget={analyticsCategory?.budgetAmount ?? 0}
                    />
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-4 border-t-2 border-dashed border-violet-500 opacity-70" />
                        Budget
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded bg-red-400 opacity-80" />
                        Over budget
                      </span>
                    </div>
                  </div>

                  {/* Top vendors */}
                  {analyticsData.topVendors.length > 0 ? (
                    <div>
                      <div className="text-xs font-black text-gray-400 uppercase tracking-wide mb-3">
                        Top Companies / Expenses
                      </div>
                      <div className="space-y-2.5">
                        {analyticsData.topVendors.map((v, i) => {
                          const maxV = analyticsData.topVendors[0].total
                          const pct = maxV > 0 ? (v.total / maxV) * 100 : 0
                          return (
                            <div key={v.description} className="flex items-center gap-2">
                              <div className="w-5 text-xs font-black text-gray-300 text-right shrink-0">{i + 1}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between mb-1">
                                  <span className="text-xs font-semibold text-gray-700 truncate mr-2">{v.description}</span>
                                  <span className="text-xs font-black text-red-500 shrink-0">
                                    ₪{v.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, background: analyticsStyle.bar }}
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400 font-semibold text-sm">
                      No transaction data yet for this category.
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}
