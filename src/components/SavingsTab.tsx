'use client'

import { useState, useEffect } from 'react'

const HOUSE_GOAL = 300_000

type SavingsAccount = {
  id: string
  name: string
  balance: number
}

const ACCOUNT_STYLES = [
  { card: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', label: 'text-emerald-700' },
  { card: 'from-teal-50 to-teal-100',       border: 'border-teal-200',    label: 'text-teal-700'    },
  { card: 'from-sky-50 to-sky-100',          border: 'border-sky-200',     label: 'text-sky-700'     },
  { card: 'from-violet-50 to-violet-100',    border: 'border-violet-200',  label: 'text-violet-700'  },
  { card: 'from-lime-50 to-lime-100',        border: 'border-lime-200',    label: 'text-lime-700'    },
  { card: 'from-cyan-50 to-cyan-100',        border: 'border-cyan-200',    label: 'text-cyan-700'    },
]

const inputCls = 'w-full border-2 border-emerald-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-400 bg-white/80'

export default function SavingsTab() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', balance: '' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBalance, setEditBalance] = useState('')

  useEffect(() => {
    fetch('/api/budget/savings-accounts')
      .then(r => r.json())
      .then(setAccounts)
  }, [])

  const total = accounts.reduce((s, a) => s + a.balance, 0)
  const pct   = Math.min((total / HOUSE_GOAL) * 100, 100)

  async function addAccount() {
    if (!form.name.trim() || !form.balance) return
    setSaving(true)
    const account: SavingsAccount = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      balance: parseFloat(form.balance),
    }
    await fetch('/api/budget/savings-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    })
    setAccounts(prev => [...prev, account])
    setForm({ name: '', balance: '' })
    setShowForm(false)
    setSaving(false)
  }

  async function deleteAccount(id: string) {
    await fetch(`/api/budget/savings-accounts/${id}`, { method: 'DELETE' })
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  async function saveEditBalance(id: string) {
    const balance = parseFloat(editBalance)
    if (isNaN(balance)) return
    await fetch(`/api/budget/savings-accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance }),
    })
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, balance } : a))
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
              ₪{total.toLocaleString()}
            </div>
            <div className="text-sm font-semibold text-gray-400 mt-0.5">
              of ₪{HOUSE_GOAL.toLocaleString()} goal
            </div>
          </div>
          <div
            className="rounded-2xl px-4 py-2 shadow-sm text-center"
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
                ₪{total.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between text-xs font-black">
          <span className="text-emerald-600">₪0</span>
          <span className="text-gray-400">
            {total < HOUSE_GOAL
              ? `₪${(HOUSE_GOAL - total).toLocaleString()} to go`
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
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Balance (₪)</label>
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
            const style = ACCOUNT_STYLES[idx % ACCOUNT_STYLES.length]
            const isEditing = editingId === account.id
            const share = HOUSE_GOAL > 0 ? (account.balance / HOUSE_GOAL) * 100 : 0

            return (
              <div
                key={account.id}
                className={`bg-gradient-to-br ${style.card} border ${style.border} rounded-2xl p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`text-sm font-black ${style.label} leading-tight`}>{account.name}</div>
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-base leading-none ml-2 shrink-0"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>

                {isEditing ? (
                  <div className="flex gap-2 items-center mt-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editBalance}
                      onChange={e => setEditBalance(e.target.value)}
                      className="flex-1 border-2 border-emerald-300 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-emerald-500 bg-white/80"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEditBalance(account.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <button
                      onClick={() => saveEditBalance(account.id)}
                      className="px-2 py-1 text-xs font-black text-white rounded-lg"
                      style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs font-black text-gray-500 rounded-lg border-2 border-gray-200 hover:bg-gray-50"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    className="text-2xl font-black text-gray-800 cursor-pointer hover:opacity-70 transition-opacity tabular-nums"
                    onClick={() => { setEditingId(account.id); setEditBalance(String(account.balance)) }}
                    title="Click to edit balance"
                  >
                    ₪{account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}

                {!isEditing && (
                  <div className={`text-xs font-semibold mt-1 ${style.label} opacity-60`}>
                    {share.toFixed(1)}% of goal
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
