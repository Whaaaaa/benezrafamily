'use client'

import { useState, useEffect } from 'react'

const CURRENCIES = [
  { code: 'ILS', symbol: '₪', name: 'Shekel'      },
  { code: 'USD', symbol: '$', name: 'US Dollar'    },
  { code: 'EUR', symbol: '€', name: 'Euro'         },
  { code: 'GBP', symbol: '£', name: 'Pound'        },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
]

const GOAL_EMOJIS = ['🏠', '🌅', '🚀', '💰', '🎓', '✈️', '🏖️', '🚗', '💎', '🎯', '👶', '🌍']

const GOAL_THEMES: Record<string, {
  card: string; border: string; label: string
  bar: string; badgeBg: string; badgeText: string
}> = {
  emerald: { card: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', label: 'text-emerald-700', bar: 'linear-gradient(90deg,#34D399,#10B981,#059669)', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },
  violet:  { card: 'from-violet-50 to-violet-100',   border: 'border-violet-200',  label: 'text-violet-700',  bar: 'linear-gradient(90deg,#A78BFA,#7C3AED)',         badgeBg: 'bg-violet-100',  badgeText: 'text-violet-700'  },
  sky:     { card: 'from-sky-50 to-sky-100',          border: 'border-sky-200',     label: 'text-sky-700',     bar: 'linear-gradient(90deg,#38BDF8,#0EA5E9)',          badgeBg: 'bg-sky-100',     badgeText: 'text-sky-700'     },
  rose:    { card: 'from-rose-50 to-rose-100',        border: 'border-rose-200',    label: 'text-rose-700',    bar: 'linear-gradient(90deg,#FB7185,#F43F5E)',          badgeBg: 'bg-rose-100',    badgeText: 'text-rose-700'    },
  amber:   { card: 'from-amber-50 to-amber-100',      border: 'border-amber-200',   label: 'text-amber-700',   bar: 'linear-gradient(90deg,#FBBF24,#F59E0B)',          badgeBg: 'bg-amber-100',   badgeText: 'text-amber-700'   },
  teal:    { card: 'from-teal-50 to-teal-100',        border: 'border-teal-200',    label: 'text-teal-700',    bar: 'linear-gradient(90deg,#2DD4BF,#14B8A6)',          badgeBg: 'bg-teal-100',    badgeText: 'text-teal-700'    },
  indigo:  { card: 'from-indigo-50 to-indigo-100',    border: 'border-indigo-200',  label: 'text-indigo-700',  bar: 'linear-gradient(90deg,#818CF8,#6366F1)',          badgeBg: 'bg-indigo-100',  badgeText: 'text-indigo-700'  },
  pink:    { card: 'from-pink-50 to-pink-100',        border: 'border-pink-200',    label: 'text-pink-700',    bar: 'linear-gradient(90deg,#F9A8D4,#EC4899)',          badgeBg: 'bg-pink-100',    badgeText: 'text-pink-700'    },
}

const ACCOUNT_STYLES = [
  { card: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', label: 'text-emerald-700' },
  { card: 'from-teal-50 to-teal-100',       border: 'border-teal-200',    label: 'text-teal-700'    },
  { card: 'from-sky-50 to-sky-100',          border: 'border-sky-200',     label: 'text-sky-700'     },
  { card: 'from-violet-50 to-violet-100',    border: 'border-violet-200',  label: 'text-violet-700'  },
  { card: 'from-lime-50 to-lime-100',        border: 'border-lime-200',    label: 'text-lime-700'    },
  { card: 'from-cyan-50 to-cyan-100',        border: 'border-cyan-200',    label: 'text-cyan-700'    },
]

type SavingsGoal = {
  id: string
  name: string
  targetAmount: number
  emoji: string
  color: string
}

type SavingsAccount = {
  id: string
  name: string
  balance: number
  currency: string
  goalId: string | null
}

type EditAccountState = { balance: string; currency: string; goalId: string }

const inputCls    = 'w-full border-2 border-emerald-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-400 bg-white/80'
const vlInputCls  = 'w-full border-2 border-violet-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80'
const selectCls   = 'border-2 border-emerald-200 rounded-xl px-2 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-400 bg-white/80'

function currencySymbol(code: string) {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? code
}

function toILS(amount: number, currency: string, rates: Record<string, number> | null): number {
  if (currency === 'ILS' || !rates) return amount
  const rate = rates[currency]
  return rate ? amount / rate : amount
}

export default function SavingsTab() {
  const [goals, setGoals]     = useState<SavingsGoal[]>([])
  const [accounts, setAccounts] = useState<SavingsAccount[]>([])
  const [rates, setRates]     = useState<Record<string, number> | null>(null)
  const [ratesDate, setRatesDate] = useState<string | null>(null)
  const [ratesError, setRatesError] = useState(false)

  // Goal form state
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal]   = useState<SavingsGoal | null>(null)
  const [goalForm, setGoalForm]         = useState({ name: '', targetAmount: '', emoji: '🎯', color: 'emerald' })
  const [savingGoal, setSavingGoal]     = useState(false)

  // Account form state
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accountForm, setAccountForm]         = useState({ name: '', balance: '', currency: 'ILS', goalId: '' })
  const [savingAccount, setSavingAccount]     = useState(false)

  // Inline account edit
  const [editingAccountId, setEditingAccountId]   = useState<string | null>(null)
  const [editAccountState, setEditAccountState]   = useState<EditAccountState>({ balance: '', currency: 'ILS', goalId: '' })

  useEffect(() => {
    fetch('/api/budget/savings-goals').then(r => r.json()).then(setGoals)
    fetch('/api/budget/savings-accounts').then(r => r.json()).then(setAccounts)
    fetch('/api/budget/exchange-rates')
      .then(r => r.json())
      .then(data => {
        if (data.rates) { setRates(data.rates); setRatesDate(data.date) }
        else setRatesError(true)
      })
      .catch(() => setRatesError(true))
  }, [])

  const hasNonILS = accounts.some(a => a.currency !== 'ILS')

  function goalTotal(goalId: string): number {
    return accounts
      .filter(a => a.goalId === goalId)
      .reduce((s, a) => s + toILS(a.balance, a.currency, rates), 0)
  }

  // ── Goal CRUD ──────────────────────────────────────────────────────────────

  function openNewGoal() {
    setEditingGoal(null)
    setGoalForm({ name: '', targetAmount: '', emoji: '🎯', color: 'emerald' })
    setShowGoalForm(true)
  }

  function openEditGoal(goal: SavingsGoal) {
    setEditingGoal(goal)
    setGoalForm({ name: goal.name, targetAmount: String(goal.targetAmount), emoji: goal.emoji, color: goal.color })
    setShowGoalForm(true)
  }

  async function saveGoal() {
    if (!goalForm.name.trim() || !goalForm.targetAmount) return
    setSavingGoal(true)
    const targetAmount = parseFloat(goalForm.targetAmount)
    if (editingGoal) {
      await fetch(`/api/budget/savings-goals/${editingGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: goalForm.name.trim(), targetAmount, emoji: goalForm.emoji, color: goalForm.color }),
      })
      setGoals(prev => prev.map(g =>
        g.id === editingGoal.id
          ? { ...g, name: goalForm.name.trim(), targetAmount, emoji: goalForm.emoji, color: goalForm.color }
          : g
      ))
    } else {
      const id = crypto.randomUUID()
      await fetch('/api/budget/savings-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: goalForm.name.trim(), targetAmount, emoji: goalForm.emoji, color: goalForm.color }),
      })
      setGoals(prev => [...prev, { id, name: goalForm.name.trim(), targetAmount, emoji: goalForm.emoji, color: goalForm.color }])
    }
    setSavingGoal(false)
    setShowGoalForm(false)
  }

  async function deleteGoal(id: string) {
    await fetch(`/api/budget/savings-goals/${id}`, { method: 'DELETE' })
    setGoals(prev => prev.filter(g => g.id !== id))
    setAccounts(prev => prev.map(a => a.goalId === id ? { ...a, goalId: null } : a))
  }

  // ── Account CRUD ───────────────────────────────────────────────────────────

  async function addAccount() {
    if (!accountForm.name.trim() || !accountForm.balance) return
    setSavingAccount(true)
    const account: SavingsAccount = {
      id: crypto.randomUUID(),
      name: accountForm.name.trim(),
      balance: parseFloat(accountForm.balance),
      currency: accountForm.currency,
      goalId: accountForm.goalId || null,
    }
    await fetch('/api/budget/savings-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    })
    setAccounts(prev => [...prev, account])
    setAccountForm({ name: '', balance: '', currency: 'ILS', goalId: '' })
    setShowAccountForm(false)
    setSavingAccount(false)
  }

  async function deleteAccount(id: string) {
    await fetch(`/api/budget/savings-accounts/${id}`, { method: 'DELETE' })
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  function startEditAccount(account: SavingsAccount) {
    setEditingAccountId(account.id)
    setEditAccountState({ balance: String(account.balance), currency: account.currency, goalId: account.goalId ?? '' })
  }

  async function saveAccountEdit(id: string) {
    const balance = parseFloat(editAccountState.balance)
    if (isNaN(balance)) return
    const goalId = editAccountState.goalId || null
    await fetch(`/api/budget/savings-accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance, currency: editAccountState.currency, goalId }),
    })
    setAccounts(prev => prev.map(a =>
      a.id === id ? { ...a, balance, currency: editAccountState.currency, goalId } : a
    ))
    setEditingAccountId(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-slide-up space-y-6">

      {/* Exchange rate note */}
      {hasNonILS && (
        <div className="text-[11px] font-semibold text-emerald-600 px-1">
          {ratesError
            ? '⚠ exchange rates unavailable'
            : ratesDate ? `💱 rates from ${ratesDate}` : '💱 loading rates…'}
        </div>
      )}

      {/* ── Goals Section ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-black text-gray-700">🎯 Savings Goals</h3>
          <button
            onClick={openNewGoal}
            className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}
          >
            + New Goal
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/30">
            <div className="text-4xl mb-2 animate-float">🎯</div>
            <p className="text-sm font-bold text-gray-400">No savings goals yet.</p>
            <p className="text-xs text-gray-300 mt-1">Create goals like &quot;House Fund&quot; or &quot;Retirement&quot;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goals.map(goal => {
              const theme = GOAL_THEMES[goal.color] ?? GOAL_THEMES.emerald
              const total = goalTotal(goal.id)
              const pct   = goal.targetAmount > 0 ? Math.min((total / goal.targetAmount) * 100, 100) : 0
              const toGo  = goal.targetAmount - total
              const count = accounts.filter(a => a.goalId === goal.id).length

              return (
                <div
                  key={goal.id}
                  className={`bg-gradient-to-br ${theme.card} border ${theme.border} rounded-3xl p-5 shadow-md`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{goal.emoji}</span>
                      <div>
                        <div className={`text-xs font-black uppercase tracking-wide ${theme.label} opacity-70 mb-0.5`}>
                          Savings Goal
                        </div>
                        <div className="text-lg font-black text-gray-800">{goal.name}</div>
                        <div className="text-[11px] font-semibold text-gray-400">
                          {count} account{count !== 1 ? 's' : ''} contributing
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => openEditGoal(goal)}
                        className={`text-xs font-black px-2 py-1 rounded-lg ${theme.label} hover:bg-white/60 transition-colors`}
                        title="Edit goal"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="text-xs font-black px-2 py-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-white/60 transition-colors"
                        title="Delete goal"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <div className="text-3xl font-black text-gray-800 tabular-nums">
                        ₪{Math.round(total).toLocaleString()}
                      </div>
                      <div className="text-xs font-semibold text-gray-400 mt-0.5">
                        of ₪{goal.targetAmount.toLocaleString()} goal
                      </div>
                    </div>
                    <div
                      className="rounded-2xl px-3 py-1.5 shadow-sm text-center shrink-0"
                      style={{ background: theme.bar }}
                    >
                      <div className="text-xl font-black text-white">{pct.toFixed(1)}%</div>
                      <div className="text-[9px] font-black text-white/80 uppercase tracking-wide">saved</div>
                    </div>
                  </div>

                  <div className="h-4 bg-white/60 rounded-full overflow-hidden shadow-inner mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-700 relative"
                      style={{ width: `${pct}%`, background: theme.bar }}
                    >
                      {pct > 10 && (
                        <span className="absolute right-2 top-0 h-full flex items-center text-[9px] font-black text-white">
                          ₪{Math.round(total).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-xs font-black">
                    <span className={theme.label}>₪0</span>
                    <span className="text-gray-400">
                      {toGo > 0
                        ? `₪${Math.round(toGo).toLocaleString()} to go`
                        : '🎉 Goal reached!'}
                    </span>
                    <span className="text-gray-500">₪{goal.targetAmount.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Goal Form Modal ── */}
      {showGoalForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowGoalForm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-2xl animate-bounce-in"
            style={{ background: 'linear-gradient(135deg,#faf5ff,#fdf2f8)' }}
            onClick={e => e.stopPropagation()}
          >
            <h4 className="text-base font-black text-gray-700 mb-4">
              {editingGoal ? 'Edit Goal' : 'New Savings Goal'}
            </h4>
            <div className="grid gap-3 mb-4">
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. House Fund, Retirement"
                  value={goalForm.name}
                  onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                  className={vlInputCls}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveGoal() }}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Target Amount (₪ ILS)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 5000000"
                  value={goalForm.targetAmount}
                  onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))}
                  className={vlInputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setGoalForm(f => ({ ...f, emoji: em }))}
                      className={`w-9 h-9 text-lg rounded-xl transition-all hover:scale-110 ${
                        goalForm.emoji === em
                          ? 'ring-2 ring-violet-400 bg-violet-100 scale-110'
                          : 'bg-white/60 hover:bg-white'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Color Theme</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(GOAL_THEMES).map(([key, theme]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setGoalForm(f => ({ ...f, color: key }))}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all hover:scale-105 ${theme.badgeBg} ${theme.badgeText} ${
                        goalForm.color === key ? 'scale-110 shadow-md opacity-100' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={goalForm.color === key ? { boxShadow: '0 0 0 2px white, 0 0 0 3.5px #7C3AED' } : {}}
                    >
                      {goalForm.color === key ? '✓ ' : ''}{key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowGoalForm(false)}
                className="px-4 py-2 text-sm font-bold border-2 border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveGoal}
                disabled={savingGoal || !goalForm.name.trim() || !goalForm.targetAmount}
                className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}
              >
                {savingGoal ? 'Saving…' : editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Accounts Section ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-black text-gray-700">🏦 Accounts</h3>
          <button
            onClick={() => setShowAccountForm(true)}
            className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md"
            style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
          >
            + Add Account
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3 animate-float">🏦</div>
            <p className="text-sm font-bold text-gray-400">No savings accounts yet.</p>
            <p className="text-xs text-gray-300 mt-1">Add your bank accounts, savings, and investments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((account, idx) => {
              const style        = ACCOUNT_STYLES[idx % ACCOUNT_STYLES.length]
              const isEditing    = editingAccountId === account.id
              const ilsValue     = toILS(account.balance, account.currency, rates)
              const sym          = currencySymbol(account.currency)
              const assignedGoal = goals.find(g => g.id === account.goalId)

              return (
                <div
                  key={account.id}
                  className={`bg-gradient-to-br ${style.card} border ${style.border} rounded-2xl p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}
                >
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

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editAccountState.balance}
                          onChange={e => setEditAccountState(s => ({ ...s, balance: e.target.value }))}
                          className="flex-1 border-2 border-emerald-300 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-emerald-500 bg-white/80 min-w-0"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveAccountEdit(account.id)
                            if (e.key === 'Escape') setEditingAccountId(null)
                          }}
                        />
                        <select
                          value={editAccountState.currency}
                          onChange={e => setEditAccountState(s => ({ ...s, currency: e.target.value }))}
                          className={`${selectCls} shrink-0`}
                        >
                          {CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                          ))}
                        </select>
                      </div>
                      {editAccountState.currency !== 'ILS' && rates && (
                        <div className="text-[11px] font-semibold text-emerald-600">
                          ≈ ₪{Math.round(toILS(parseFloat(editAccountState.balance) || 0, editAccountState.currency, rates)).toLocaleString()} ILS
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wide">Savings Goal</label>
                        <select
                          value={editAccountState.goalId}
                          onChange={e => setEditAccountState(s => ({ ...s, goalId: e.target.value }))}
                          className="w-full border-2 border-emerald-200 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:border-emerald-400 bg-white/80"
                        >
                          <option value="">— No goal —</option>
                          {goals.map(g => (
                            <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveAccountEdit(account.id)}
                          className="flex-1 py-1 text-xs font-black text-white rounded-lg"
                          style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
                        >
                          ✓ Save
                        </button>
                        <button
                          onClick={() => setEditingAccountId(null)}
                          className="flex-1 py-1 text-xs font-black text-gray-500 rounded-lg border-2 border-gray-200 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="cursor-pointer hover:opacity-70 transition-opacity"
                        onClick={() => startEditAccount(account)}
                        title="Click to edit"
                      >
                        <div className="text-2xl font-black text-gray-800 tabular-nums">
                          {sym}{account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {account.currency !== 'ILS' && (
                          <div className="text-xs font-semibold text-gray-500 mt-0.5">
                            {rates ? `≈ ₪${Math.round(ilsValue).toLocaleString()}` : 'loading rate…'}
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        {assignedGoal ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${(GOAL_THEMES[assignedGoal.color] ?? GOAL_THEMES.emerald).badgeBg} ${(GOAL_THEMES[assignedGoal.color] ?? GOAL_THEMES.emerald).badgeText}`}
                          >
                            {assignedGoal.emoji} {assignedGoal.name}
                          </span>
                        ) : (
                          <button
                            onClick={() => startEditAccount(account)}
                            className="text-[11px] font-bold text-gray-300 hover:text-gray-500 transition-colors"
                          >
                            + assign goal
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add Account Modal ── */}
      {showAccountForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAccountForm(false)}
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
                  value={accountForm.name}
                  onChange={e => setAccountForm(f => ({ ...f, name: e.target.value }))}
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
                    value={accountForm.balance}
                    onChange={e => setAccountForm(f => ({ ...f, balance: e.target.value }))}
                    className={inputCls}
                    onKeyDown={e => { if (e.key === 'Enter') addAccount() }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Currency</label>
                  <select
                    value={accountForm.currency}
                    onChange={e => setAccountForm(f => ({ ...f, currency: e.target.value }))}
                    className={inputCls}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {accountForm.currency !== 'ILS' && rates && (
                <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
                  ≈ ₪{Math.round(toILS(parseFloat(accountForm.balance) || 0, accountForm.currency, rates)).toLocaleString()} ILS at today&apos;s rate
                </div>
              )}
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Savings Goal</label>
                <select
                  value={accountForm.goalId}
                  onChange={e => setAccountForm(f => ({ ...f, goalId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">— No goal —</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAccountForm(false)}
                className="px-4 py-2 text-sm font-bold border-2 border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={addAccount}
                disabled={savingAccount || !accountForm.name.trim() || !accountForm.balance}
                className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
              >
                {savingAccount ? 'Saving…' : 'Add Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
