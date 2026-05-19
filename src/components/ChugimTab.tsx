'use client'

import { useState, useEffect } from 'react'

type Chug = {
  id: string
  name: string
  child: string
  days: string[]
  time: string
  monthlyCost: number
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CHILD_BADGE: Record<string, string> = {
  Moony: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Moshe: 'bg-sky-100 text-sky-800 border-sky-200',
  Pooki: 'bg-pink-100 text-pink-800 border-pink-200',
}

const CHILD_GRADIENT: Record<string, string> = {
  Moony: 'linear-gradient(135deg, #10B981, #059669)',
  Moshe: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
  Pooki: 'linear-gradient(135deg, #EC4899, #F43F5E)',
}

const EMPTY_FORM = {
  name: '',
  child: 'Moony' as string,
  days: [] as string[],
  time: '',
  monthlyCost: '',
}

const inputCls = 'w-full border-2 border-violet-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80'

export default function ChugimTab() {
  const [chugim, setChugim] = useState<Chug[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/budget/chugim').then(r => r.json()).then(setChugim)
  }, [])

  function startAdd() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setShowForm(true)
  }

  function startEdit(chug: Chug) {
    setEditingId(chug.id)
    setForm({
      name: chug.name,
      child: chug.child,
      days: [...chug.days],
      time: chug.time,
      monthlyCost: String(chug.monthlyCost),
    })
    setShowForm(true)
  }

  function cancelForm() {
    setForm({ ...EMPTY_FORM })
    setEditingId(null)
    setShowForm(false)
  }

  function toggleDay(day: string) {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }))
  }

  async function saveChug() {
    if (!form.name.trim() || form.days.length === 0 || !form.monthlyCost) return
    setSaving(true)
    const cost = parseFloat(form.monthlyCost)
    if (editingId) {
      await fetch(`/api/budget/chugim/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), child: form.child, days: form.days, time: form.time, monthlyCost: cost }),
      })
      setChugim(prev => prev.map(c => c.id === editingId
        ? { ...c, name: form.name.trim(), child: form.child, days: form.days, time: form.time, monthlyCost: cost }
        : c
      ))
    } else {
      const id = crypto.randomUUID()
      const transactionId = crypto.randomUUID()
      await fetch('/api/budget/chugim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: form.name.trim(), child: form.child, days: form.days, time: form.time, monthlyCost: cost, transactionId }),
      })
      setChugim(prev => [...prev, { id, name: form.name.trim(), child: form.child, days: form.days, time: form.time, monthlyCost: cost }])
    }
    cancelForm()
    setSaving(false)
  }

  async function deleteChug(id: string) {
    await fetch(`/api/budget/chugim/${id}`, { method: 'DELETE' })
    setChugim(prev => prev.filter(c => c.id !== id))
  }

  const totalMonthlyCost = chugim.reduce((s, c) => s + c.monthlyCost, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3
            className="text-2xl font-black"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            🎽 Chugim
          </h3>
          {chugim.length > 0 && (
            <p className="text-sm text-gray-500 font-semibold mt-0.5">
              {chugim.length} {chugim.length === 1 ? 'activity' : 'activities'} · ₪{totalMonthlyCost.toLocaleString()}/month
            </p>
          )}
        </div>
        {!showForm && (
          <button
            onClick={startAdd}
            className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
          >
            + Add Chug
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div
          className="rounded-2xl p-5 mb-6 shadow-md border border-violet-100 animate-bounce-in"
          style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)' }}
        >
          <h4 className="text-xs font-black text-violet-600 uppercase tracking-wide mb-4">
            {editingId ? 'Edit Activity' : 'New Activity'}
          </h4>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Activity Name</label>
              <input
                type="text"
                placeholder="e.g. Tennis, Ballet, Swimming"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Child</label>
              <select
                value={form.child}
                onChange={e => setForm(f => ({ ...f, child: e.target.value }))}
                className={inputCls}
              >
                <option>Moony</option>
                <option>Moshe</option>
                <option>Pooki</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">Monthly Cost (₪)</label>
              <input
                type="number"
                min="0"
                step="10"
                placeholder="0"
                value={form.monthlyCost}
                onChange={e => setForm(f => ({ ...f, monthlyCost: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Days selector */}
          <div className="mb-4">
            <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wide">Days of the Week</label>
            <div className="flex gap-2 flex-wrap">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition-all border ${
                    form.days.includes(day)
                      ? 'text-white shadow-md scale-105 border-transparent'
                      : 'bg-white/70 text-gray-500 border-gray-200 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200'
                  }`}
                  style={form.days.includes(day) ? { background: 'linear-gradient(135deg, #7C3AED, #A855F7)' } : {}}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelForm}
              className="px-4 py-2 text-sm font-bold border-2 border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={saveChug}
              disabled={saving || !form.name.trim() || form.days.length === 0 || !form.monthlyCost}
              className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
            >
              {saving ? 'Saving…' : editingId ? 'Update' : 'Add Chug'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {chugim.length === 0 && !showForm && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 animate-float">🎽</div>
          <p className="text-base font-bold text-gray-400">No chugim yet.</p>
          <p className="text-sm text-gray-300 mt-1">Add activities to track schedule and budget.</p>
          <button
            onClick={startAdd}
            className="mt-4 px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
          >
            + Add First Chug
          </button>
        </div>
      )}

      {/* Chugim list */}
      {chugim.length > 0 && (
        <div className="space-y-3">
          {chugim.map(chug => (
            <div
              key={chug.id}
              className="rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h4 className="font-black text-gray-800 text-base">{chug.name}</h4>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${CHILD_BADGE[chug.child] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                    >
                      {chug.child}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-gray-500 font-semibold">
                      📅 {chug.days.join(' · ')}
                      {chug.time && <span className="ml-1 text-gray-400">at {chug.time}</span>}
                    </span>
                    <span
                      className="text-sm font-black"
                      style={{
                        background: CHILD_GRADIENT[chug.child] ?? 'linear-gradient(135deg,#7C3AED,#EC4899)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      ₪{chug.monthlyCost.toLocaleString()}/mo
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 pt-0.5">
                  <button
                    onClick={() => startEdit(chug)}
                    className="px-3 py-1.5 text-xs font-bold text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-violet-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteChug(chug.id)}
                    className="px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly total card */}
      {chugim.length > 0 && (
        <div
          className="mt-6 rounded-2xl px-5 py-4 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)' }}
        >
          <div className="flex justify-between items-center">
            <span className="font-black text-gray-500 text-sm uppercase tracking-wide">Total Monthly Cost</span>
            <span
              className="font-black text-2xl"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ₪{totalMonthlyCost.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-semibold mt-1">
            Automatically tracked under Kids / School / Chugim
          </p>
        </div>
      )}
    </div>
  )
}
