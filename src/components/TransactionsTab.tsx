'use client'

import { useState, useEffect, useMemo } from 'react'

type BudgetCategory = {
  id: string
  name: string
  budgetAmount: number
  sortOrder: number
}

type Chug = {
  id: string
  name: string
  child: string
  days: string[]
  time: string
  monthlyCost: number
}

type TxnRow = {
  id: string
  date: string
  description: string
  amount: number
  categoryId: string
  type: 'manual' | 'cc'
  month?: string
  isRecurring?: boolean
  recurringInterval?: string
  recurringStartMonth?: string | null
  isChug?: boolean
  chugId?: string | null
}

// Next month from a YYYY-MM string
function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const CHILD_BADGE: Record<string, string> = {
  Moony: 'bg-emerald-100 text-emerald-700',
  Moshe: 'bg-sky-100 text-sky-700',
  Pooki: 'bg-pink-100 text-pink-700',
}

export default function TransactionsTab({ categories }: { categories: BudgetCategory[] }) {
  const [transactions, setTransactions] = useState<TxnRow[]>([])
  const [chugim, setChugim] = useState<Chug[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'cc'>('all')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // "Create recurring from CC" inline form
  const [recurringModal, setRecurringModal] = useState<{
    txn: TxnRow
    interval: 'monthly' | 'bimonthly'
    startMonth: string
  } | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/budget/transactions').then(r => r.json()),
      fetch('/api/budget/cc-transactions?month=all').then(r => r.json()),
      fetch('/api/budget/chugim').then(r => r.json()),
    ]).then(([manual, cc, chugs]) => {
      const manualRows: TxnRow[] = manual.map((t: {
        id: string; date: string; description: string; amount: string | number;
        categoryId: string; isRecurring: boolean; recurringInterval: string;
        recurringStartMonth: string | null; chugId: string | null
      }) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        categoryId: t.categoryId,
        type: 'manual' as const,
        isRecurring: t.isRecurring,
        recurringInterval: t.recurringInterval || 'monthly',
        recurringStartMonth: t.recurringStartMonth,
        isChug: !!t.chugId,
        chugId: t.chugId,
      }))
      const ccRows: TxnRow[] = cc.map((t: {
        id: string; date: string; description: string; amount: string | number;
        categoryId: string; month: string; chugId: string | null
      }) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        categoryId: t.categoryId,
        type: 'cc' as const,
        month: t.month,
        chugId: t.chugId,
      }))
      const all = [...manualRows, ...ccRows].sort((a, b) => b.date.localeCompare(a.date))
      setTransactions(all)
      setChugim(chugs)
      setLoading(false)
    })
  }, [])

  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    transactions.forEach(t => months.add(t.month || t.date.slice(0, 7)))
    return Array.from(months).sort().reverse()
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterMonth && (t.month || t.date.slice(0, 7)) !== filterMonth) return false
      if (filterCategory === '__uncategorized__') { if (t.categoryId) return false }
      else if (filterCategory && t.categoryId !== filterCategory) return false
      if (filterType !== 'all' && t.type !== filterType) return false
      return true
    })
  }, [transactions, search, filterMonth, filterCategory, filterType])

  const uncategorizedCount = filtered.filter(t => !t.categoryId).length
  const totalAmount = filtered.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0)

  async function updateCategory(txn: TxnRow, newCategoryId: string) {
    setSavingId(txn.id)
    const url = txn.type === 'cc'
      ? `/api/budget/cc-transactions/${txn.id}`
      : `/api/budget/transactions/${txn.id}`
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: newCategoryId }),
    })
    setTransactions(prev => prev.map(t => t.id === txn.id ? { ...t, categoryId: newCategoryId } : t))
    setSavingId(null)
  }

  async function updateChug(txn: TxnRow, chugId: string) {
    await fetch(`/api/budget/cc-transactions/${txn.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chugId: chugId || null }),
    })
    setTransactions(prev => prev.map(t => t.id === txn.id ? { ...t, chugId: chugId || null } : t))
  }

  async function updateManualRecurring(txn: TxnRow, interval: 'monthly' | 'bimonthly' | null) {
    const isRecurring = interval !== null
    const startMonth = isRecurring ? (txn.recurringStartMonth || txn.date.slice(0, 7)) : null
    await fetch(`/api/budget/transactions/${txn.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRecurring, recurringInterval: interval ?? 'monthly', recurringStartMonth: startMonth }),
    })
    setTransactions(prev => prev.map(t => t.id === txn.id
      ? { ...t, isRecurring, recurringInterval: interval ?? 'monthly', recurringStartMonth: startMonth }
      : t
    ))
  }

  async function createRecurringEntry() {
    if (!recurringModal) return
    const { txn, interval, startMonth } = recurringModal
    const id = crypto.randomUUID()
    const newTxn: TxnRow = {
      id,
      date: txn.date,
      description: txn.description,
      amount: txn.amount,
      categoryId: txn.categoryId,
      type: 'manual',
      isRecurring: true,
      recurringInterval: interval,
      recurringStartMonth: startMonth,
      isChug: !!txn.chugId,
      chugId: txn.chugId,
    }
    await fetch('/api/budget/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        date: txn.date,
        description: txn.description,
        amount: txn.amount,
        categoryId: txn.categoryId,
        isRecurring: true,
        recurringDay: 1,
        chugId: txn.chugId ?? null,
        recurringInterval: interval,
        recurringStartMonth: startMonth,
      }),
    })
    setTransactions(prev => [newTxn, ...prev])
    setRecurringModal(null)
    setExpandedId(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h3
          className="text-2xl font-black"
          style={{
            background: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          📋 All Transactions
        </h3>
        {!loading && (
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            {filtered.length} transactions · ₪{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} total
            {uncategorizedCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 font-black rounded-full text-xs">
                {uncategorizedCount} uncategorized
              </span>
            )}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="🔍  Search by description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] border-2 border-violet-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white"
        />
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="border-2 border-violet-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white text-gray-700"
        >
          <option value="">All Months</option>
          {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border-2 border-violet-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white text-gray-700"
        >
          <option value="">All Categories</option>
          <option value="__uncategorized__">— Uncategorized —</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex rounded-xl border-2 border-violet-200 overflow-hidden bg-white">
          {(['all', 'manual', 'cc'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-2 text-xs font-black transition-colors ${filterType === t ? 'text-white' : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'}`}
              style={filterType === t ? { background: 'linear-gradient(135deg, #7C3AED, #A855F7)' } : {}}
            >
              {t === 'all' ? 'All' : t === 'manual' ? 'Manual' : 'CC'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 font-semibold">
          <div className="text-4xl mb-3 animate-float">⏳</div>
          Loading transactions…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-bold text-gray-400">No transactions match your filters.</p>
          {(search || filterMonth || filterCategory || filterType !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterMonth(''); setFilterCategory(''); setFilterType('all') }}
              className="mt-3 text-sm font-bold text-violet-500 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-violet-100 shadow-md">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
                <th className="px-3 py-3 text-left font-black text-white whitespace-nowrap">Date</th>
                <th className="px-3 py-3 text-left font-black text-white">Description</th>
                <th className="px-3 py-3 text-right font-black text-white whitespace-nowrap">Amount</th>
                <th className="px-3 py-3 text-left font-black text-white">Category</th>
                <th className="px-3 py-3 w-8 text-white font-black text-center">⚙</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50">
              {filtered.map(t => (
                <>
                  <tr
                    key={t.id}
                    className={`transition-colors ${!t.categoryId ? 'bg-amber-50 hover:bg-amber-100/50' : expandedId === t.id ? 'bg-violet-50' : 'hover:bg-violet-50/30'}`}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="text-gray-500 font-semibold text-xs">{t.date}</div>
                      {/* Type + recurring badges */}
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                          t.isChug ? 'bg-violet-100 text-violet-700'
                          : t.type === 'cc' ? 'bg-blue-100 text-blue-700'
                          : t.isRecurring ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                        }`}>
                          {t.isChug ? '🎽' : t.type === 'cc' ? '💳' : t.isRecurring ? '🔁' : '📝'}
                        </span>
                        {t.isRecurring && (
                          <span className="text-[10px] font-black text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full border border-violet-100">
                            {t.recurringInterval === 'bimonthly' ? '2mo' : '1mo'}
                            {t.recurringStartMonth && <span className="ml-0.5 opacity-60">→{t.recurringStartMonth.slice(5)}</span>}
                          </span>
                        )}
                        {t.chugId && !t.isChug && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${CHILD_BADGE[chugim.find(c => c.id === t.chugId)?.child ?? ''] ?? 'bg-violet-100 text-violet-700'}`}>
                            {chugim.find(c => c.id === t.chugId)?.name ?? '🎽'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 font-semibold max-w-[200px]">
                      <div className="truncate">{t.description}</div>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-black tabular-nums whitespace-nowrap ${t.amount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {t.amount > 0 ? '−' : '+'}₪{Math.abs(t.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={t.categoryId}
                        onChange={e => updateCategory(t, e.target.value)}
                        disabled={savingId === t.id}
                        className={`text-xs border-2 rounded-lg px-1.5 py-1 font-semibold text-gray-700 bg-white focus:outline-none transition-colors disabled:opacity-50 ${
                          !t.categoryId ? 'border-amber-300 focus:border-amber-500' : 'border-violet-200 focus:border-violet-400'
                        }`}
                      >
                        <option value="">— Uncategorized —</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                          expandedId === t.id
                            ? 'text-white shadow-sm'
                            : 'text-gray-400 hover:text-violet-600 hover:bg-violet-100'
                        }`}
                        style={expandedId === t.id ? { background: 'linear-gradient(135deg,#7C3AED,#A855F7)' } : {}}
                        title="More options"
                      >
                        {expandedId === t.id ? '▴' : '▾'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded action row */}
                  {expandedId === t.id && (
                    <tr key={`${t.id}-exp`}>
                      <td colSpan={5} className="px-4 py-3 bg-violet-50/70 border-t border-violet-100">
                        <div className="flex items-start gap-6 flex-wrap">

                          {/* Chug link — CC transactions only */}
                          {t.type === 'cc' && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Link to Chug</span>
                              <select
                                value={t.chugId ?? ''}
                                onChange={e => updateChug(t, e.target.value)}
                                className="text-xs border-2 border-violet-200 rounded-lg px-2 py-1 font-semibold text-gray-700 bg-white focus:outline-none focus:border-violet-400"
                              >
                                <option value="">— None —</option>
                                {chugim.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} ({c.child})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Recurring control */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Recurring Schedule</span>
                            {t.type === 'cc' ? (
                              /* CC: create a new recurring manual template */
                              recurringModal?.txn.id === t.id ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex rounded-lg border-2 border-violet-200 overflow-hidden text-xs">
                                    {(['monthly', 'bimonthly'] as const).map(iv => (
                                      <button
                                        key={iv}
                                        onClick={() => setRecurringModal(m => m ? { ...m, interval: iv } : m)}
                                        className={`px-2.5 py-1 font-black transition-colors ${recurringModal.interval === iv ? 'text-white' : 'text-gray-500 hover:bg-violet-50'}`}
                                        style={recurringModal.interval === iv ? { background: 'linear-gradient(135deg,#7C3AED,#A855F7)' } : {}}
                                      >
                                        {iv === 'monthly' ? 'Monthly' : 'Bi-monthly'}
                                      </button>
                                    ))}
                                  </div>
                                  <input
                                    type="month"
                                    value={recurringModal.startMonth}
                                    onChange={e => setRecurringModal(m => m ? { ...m, startMonth: e.target.value } : m)}
                                    className="text-xs border-2 border-violet-200 rounded-lg px-2 py-1 font-semibold bg-white focus:outline-none focus:border-violet-400"
                                  />
                                  <button
                                    onClick={createRecurringEntry}
                                    className="px-3 py-1 text-xs font-black text-white rounded-lg shadow-sm transition-all hover:scale-105"
                                    style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
                                  >
                                    ✓ Create
                                  </button>
                                  <button
                                    onClick={() => setRecurringModal(null)}
                                    className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setRecurringModal({
                                      txn: t,
                                      interval: 'monthly',
                                      startMonth: nextMonth(t.month || t.date.slice(0, 7)),
                                    })}
                                    className="px-3 py-1 text-xs font-black text-violet-600 border-2 border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
                                  >
                                    + Create Recurring Entry
                                  </button>
                                </div>
                              )
                            ) : (
                              /* Manual: toggle the transaction's own recurring flag */
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex rounded-lg border-2 border-violet-200 overflow-hidden text-xs">
                                  {([null, 'monthly', 'bimonthly'] as const).map(iv => (
                                    <button
                                      key={iv ?? 'none'}
                                      onClick={() => updateManualRecurring(t, iv)}
                                      className={`px-2.5 py-1 font-black transition-colors ${
                                        (iv === null ? !t.isRecurring : t.isRecurring && t.recurringInterval === iv)
                                          ? 'text-white'
                                          : 'text-gray-500 hover:bg-violet-50'
                                      }`}
                                      style={(iv === null ? !t.isRecurring : t.isRecurring && t.recurringInterval === iv)
                                        ? { background: 'linear-gradient(135deg,#7C3AED,#A855F7)' }
                                        : {}
                                      }
                                    >
                                      {iv === null ? 'None' : iv === 'monthly' ? 'Monthly' : 'Bi-monthly'}
                                    </button>
                                  ))}
                                </div>
                                {t.isRecurring && (
                                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                                    from
                                    <input
                                      type="month"
                                      value={t.recurringStartMonth ?? ''}
                                      onChange={async e => {
                                        const sm = e.target.value || null
                                        await fetch(`/api/budget/transactions/${t.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            isRecurring: true,
                                            recurringInterval: t.recurringInterval,
                                            recurringStartMonth: sm,
                                          }),
                                        })
                                        setTransactions(prev => prev.map(r => r.id === t.id ? { ...r, recurringStartMonth: sm } : r))
                                      }}
                                      className="text-[10px] border border-violet-200 rounded px-1 py-0.5 font-semibold bg-white focus:outline-none"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
