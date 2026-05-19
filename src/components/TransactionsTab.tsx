'use client'

import { useState, useEffect, useMemo } from 'react'

type BudgetCategory = {
  id: string
  name: string
  budgetAmount: number
  sortOrder: number
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
  isChug?: boolean
}

export default function TransactionsTab({ categories }: { categories: BudgetCategory[] }) {
  const [transactions, setTransactions] = useState<TxnRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'cc'>('all')
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/budget/transactions').then(r => r.json()),
      fetch('/api/budget/cc-transactions?month=all').then(r => r.json()),
    ]).then(([manual, cc]) => {
      const manualRows: TxnRow[] = manual.map((t: {
        id: string; date: string; description: string; amount: string | number;
        categoryId: string; isRecurring: boolean; chugId: string | null
      }) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        categoryId: t.categoryId,
        type: 'manual' as const,
        isRecurring: t.isRecurring,
        isChug: !!t.chugId,
      }))
      const ccRows: TxnRow[] = cc.map((t: {
        id: string; date: string; description: string; amount: string | number;
        categoryId: string; month: string
      }) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        categoryId: t.categoryId,
        type: 'cc' as const,
        month: t.month,
      }))
      const all = [...manualRows, ...ccRows].sort((a, b) => b.date.localeCompare(a.date))
      setTransactions(all)
      setLoading(false)
    })
  }, [])

  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    transactions.forEach(t => {
      const m = t.month || t.date.slice(0, 7)
      if (m) months.add(m)
    })
    return Array.from(months).sort().reverse()
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterMonth) {
        const txMonth = t.month || t.date.slice(0, 7)
        if (txMonth !== filterMonth) return false
      }
      if (filterCategory === '__uncategorized__') {
        if (t.categoryId) return false
      } else if (filterCategory) {
        if (t.categoryId !== filterCategory) return false
      }
      if (filterType !== 'all' && t.type !== filterType) return false
      return true
    })
  }, [transactions, search, filterMonth, filterCategory, filterType])

  const uncategorizedCount = filtered.filter(t => !t.categoryId).length

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

  const totalAmount = filtered.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0)

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
          {availableMonths.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border-2 border-violet-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white text-gray-700"
        >
          <option value="">All Categories</option>
          <option value="__uncategorized__">— Uncategorized —</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex rounded-xl border-2 border-violet-200 overflow-hidden bg-white">
          {(['all', 'manual', 'cc'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-2 text-xs font-black transition-colors ${
                filterType === t
                  ? 'text-white'
                  : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
              }`}
              style={filterType === t ? { background: 'linear-gradient(135deg, #7C3AED, #A855F7)' } : {}}
            >
              {t === 'all' ? 'All' : t === 'manual' ? 'Manual' : 'CC'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
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
                <th className="px-3 py-3 text-left font-black text-white">Type</th>
                <th className="px-3 py-3 text-left font-black text-white">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50">
              {filtered.map(t => (
                <tr
                  key={t.id}
                  className={`transition-colors ${!t.categoryId ? 'bg-amber-50 hover:bg-amber-100/50' : 'hover:bg-violet-50/30'}`}
                >
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap font-semibold text-xs">
                    {t.date}
                  </td>
                  <td className="px-3 py-2.5 text-gray-700 font-semibold max-w-[220px]">
                    <div className="truncate">{t.description}</div>
                  </td>
                  <td className={`px-3 py-2.5 text-right font-black tabular-nums whitespace-nowrap ${t.amount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {t.amount > 0 ? '−' : '+'}₪{Math.abs(t.amount).toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                      t.isChug
                        ? 'bg-violet-100 text-violet-700'
                        : t.type === 'cc'
                        ? 'bg-blue-100 text-blue-700'
                        : t.isRecurring
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {t.isChug ? '🎽 Chug' : t.type === 'cc' ? '💳 CC' : t.isRecurring ? '🔁 Recurring' : '📝 Manual'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={t.categoryId}
                      onChange={e => updateCategory(t, e.target.value)}
                      disabled={savingId === t.id || t.isChug}
                      className={`text-xs border-2 rounded-lg px-1.5 py-1 font-semibold text-gray-700 bg-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        !t.categoryId
                          ? 'border-amber-300 focus:border-amber-500'
                          : 'border-violet-200 focus:border-violet-400'
                      }`}
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
    </div>
  )
}
