'use client'

import { useState, useEffect } from 'react'

const HOUSE_GOAL = 300_000

const CURRENCIES = [
  { code: 'ILS', symbol: '₪', name: 'Shekel'       },
  { code: 'USD', symbol: '$', name: 'US Dollar'     },
  { code: 'EUR', symbol: '€', name: 'Euro'          },
  { code: 'GBP', symbol: '£', name: 'Pound'         },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc'  },
]

type SavingsAccount = {
  id: string
  name: string
  balance: number
  currency: string
}

type EditState = { balance: string; currency: string }

const ACCOUNT_STYLES = [
  { card: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', label: 'text-emerald-700' },
  { card: 'from-teal-50 to-teal-100',       border: 'border-teal-200',    label: 'text-teal-700'    },
  { card: 'from-sky-50 to-sky-100',          border: 'border-sky-200',     label: 'text-sky-700'     },
  { card: 'from-violet-50 to-violet-100',    border: 'border-violet-200',  label: 'text-violet-700'  },
  { card: 'from-lime-50 to-lime-100',        border: 'border-lime-200',    label: 'text-lime-700'    },
  { card: 'from-cyan-50 to-cyan-100',        border: 'border-cyan-200',    label: 'text-cyan-700'    },
]

const inputCls = 'w-full border-2 border-emerald-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-400 bg-white/80'
const selectCls = 'border-2 border-emerald-200 rounded-xl px-2 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-400 bg-white/80'

function currencySymbol(code: string) {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? code
}

// rates[X] = units of X per 1 ILS  →  ILS value of amount in X = amount / rates[X]
function toILS(amount: number, currency: string, rates: Record<string, number> | null): number {
  if (currency === 'ILS' || !rates) return amount
  const rate = rates[currency]
  return rate ? amount / rate : amount
}

export default function SavingsTab() {
  const [accounts, setAccounts]   = useState<SavingsAccount[]>([])
  const [rates, setRates]         = useState<Record<string, number> | null>(null)
  const [ratesDate, setRatesDate] = useState<string | null>(null)
  const [ratesError, setRatesError] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ name: '', balance: '', currency: 'ILS' })
  const [saving, setSaving]     = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ balance: '', currency: 'ILS' })

  useEffect(() => {
    fetch('/api/budget/savings-accounts')
      .then(r => r.json())
      .then(setAccounts)
    fetch('/api/budget/exchange-rates')
      .then(r => r.json())
      .then(data => {
        if (data.rates) { setRates(data.rates); setRatesDate(data.date) }
        else setRatesError(true)
      })
      .catch(() => setRatesError(true))
  }, [])

  const totalILS = accounts.reduce((s, a) => s + toILS(a.balance, a.currency, rates), 0)
  const pct      = Math.min((totalILS / HOUSE_GOAL) * 100, 100)
  const hasNonILS = accounts.some(a => a.currency !== 'ILS')

  async function addAccount() {
    if (!form.name.trim() || !form.balance) return
    setSaving(true)
    const account: SavingsAccount = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      balance: parseFloat(form.balance),
      currency: form.currency,
    }
    await fetch('/api/budget/savings-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    })
    setAccounts(prev => [...prev, account])
    setForm({ name: '', balance: '', currency: 'ILS' })
    setShowForm(false)
    setSaving(false)
  }

  async function deleteAccount(id: string) {
    await fetch(`/api/budget/savings-accounts/${id}`, { method: 'DELETE' })
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  function startEdit(account: SavingsAccount) {
    setEditingId(account.id)
    setEditState({ balance: String(account.balance), currency: account.currency })
  }

  async function saveEdit(id: string) {
    const balance = parseFloat(editState.balance)
    if (isNaN(balance)) return
    await fetch(`/api/budget/savings-accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance, currency: editState.currency }),
    })
    setAccounts(prev => prev.map(a =>
      a.id === id ? { ...a, balance, currency: editState.currency } : a
    ))
    setEditingId(null)
  }

  return (
    <div className="animate-slide-up">

      {/* ── Goal Progress Hero ── */}
      <div
        className="rounded-3xl p-6 mb-6 shadow-md"
        style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5, #f0fdf4)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-xs font-black text-emerald-500 uppercase tracking-wide mb-1">House Fund Goal 🏠</div>
            <div className="text-4xl font-black text-gray-800 tabular-nums">
              ₪{Math.round(totalILS).toLocaleString()}
            </div>
            <div className="text-sm font-semibold text-gray-400 mt-0.5">
              of ₪{HOUSE_GOAL.toLocaleString()} goal
            </div>
            {hasNonILS && (
              <div className="mt-1.5 text-[11px] font-semibold text-emerald-600">
                {ratesError
                  ? '⚠ exchange rates unavailable — showing last known values'
                  : ratesDate
                    ? `rates from ${ratesDate}`
                    : 'loading rates…'}
              </div>
            )}
          </div>
          <div
            className="rounded-2xl px-4 py-2 shadow-sm text-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
          >
            <div className="text-2xl font-black text-white">{pct.toFixed(1)}%</div>
            <div className="text-[10px] font-black text-emerald-100 uppercase tracking-wide">saved</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-6 bg-white/60 rounded-full overflow-hidden shadow-inner mb-2">
          <div
            className="h-full rounded-full transition-all duration-700 relative"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#34D399,#10B981,#059669)' }}
          >
            {pct > 8 && (
              <span className="absolute right-2 top-0 h-full flex items-center text-[10px] font-black text-white">
                ₪{Math.round(totalILS).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between text-xs font-black">
          <span className="text-emerald-600">₪0</span>
          <span className="text-gray-400">
            {totalILS < HOUSE_GOAL
              ? `₪${Math.round(HOUSE_GOAL - totalILS).toLocaleString()} to go`
              : '🎉 Goal reached!'}
          </span>
          <span className="text-gray-500">₪{HOUSE_GOAL.toLocaleString()}</span>
        </div>
      </div>

      {/* ── Accounts header ── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-gray-700">🏦 Accounts</h3>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md"
          style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
        >
          + Add Account
        </button>
      </div>

      {/* ── Add Account Modal ── */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-2xl animate-bounce-in"
            style={{ background: 'linear-gradient(135deg,#ecfdf5,#f0fdf4)' }}
            onClick={e => e.stopPropagation()}
          >
            <h4 className="text-base font-black text-gray-700 mb-4">Add Savings Account</h4>
            <div className="grid gap-3 mb-4">
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mizrahi Bank, Crypto, Cash"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') addAccount() }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Balance</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.balance}
                    onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                    className={inputCls}
                    onKeyDown={e => { if (e.key === 'Enter') addAccount() }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Currency</label>
                  <select
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className={inputCls}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {form.currency !== 'ILS' && rates && (
                <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
                  ≈ ₪{Math.round(toILS(parseFloat(form.balance) || 0, form.currency, rates)).toLocaleString()} ILS at today&apos;s rate
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-bold border-2 border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={addAccount}
                disabled={saving || !form.name.trim() || !form.balance}
                className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
              >
                {saving ? 'Saving…' : 'Add Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Account Cards ── */}
      {accounts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3 animate-float">🏦</div>
          <p className="text-sm font-bold text-gray-400">No savings accounts yet.</p>
          <p className="text-xs text-gray-300 mt-1">Add your bank accounts, savings, and investments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.map((account, idx) => {
            const style    = ACCOUNT_STYLES[idx % ACCOUNT_STYLES.length]
            const isEditing = editingId === account.id
            const ilsValue = toILS(account.balance, account.currency, rates)
            const share    = HOUSE_GOAL > 0 ? (ilsValue / HOUSE_GOAL) * 100 : 0
            const sym      = currencySymbol(account.currency)

            return (
              <div
                key={account.id}
                className={`bg-gradient-to-br ${style.card} border ${style.border} rounded-2xl p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className={`text-sm font-black ${style.label} leading-tight`}>{account.name}</div>
                    {!isEditing && (
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wide mt-0.5">
                        {account.currency}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-base leading-none ml-2 shrink-0"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>

                {/* Edit form */}
                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editState.balance}
                        onChange={e => setEditState(s => ({ ...s, balance: e.target.value }))}
                        className="flex-1 border-2 border-emerald-300 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-emerald-500 bg-white/80 min-w-0"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(account.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <select
                        value={editState.currency}
                        onChange={e => setEditState(s => ({ ...s, currency: e.target.value }))}
                        className={`${selectCls} shrink-0`}
                      >
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                        ))}
                      </select>
                    </div>
                    {editState.currency !== 'ILS' && rates && (
                      <div className="text-[11px] font-semibold text-emerald-600">
                        ≈ ₪{Math.round(toILS(parseFloat(editState.balance) || 0, editState.currency, rates)).toLocaleString()} ILS
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(account.id)}
                        className="flex-1 py-1 text-xs font-black text-white rounded-lg"
                        style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
                      >
                        ✓ Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-1 text-xs font-black text-gray-500 rounded-lg border-2 border-gray-200 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Balance display — click to edit */}
                    <div
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                      onClick={() => startEdit(account)}
                      title="Click to edit"
                    >
                      <div className="text-2xl font-black text-gray-800 tabular-nums">
                        {sym}{account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {account.currency !== 'ILS' && (
                        <div className="text-xs font-semibold text-gray-500 mt-0.5">
                          {rates
                            ? `≈ ₪${Math.round(ilsValue).toLocaleString()}`
                            : 'loading rate…'}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs font-semibold mt-1.5 ${style.label} opacity-60`}>
                      {share.toFixed(1)}% of goal
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
