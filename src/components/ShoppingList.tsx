'use client'

import { useState, useEffect, useMemo } from 'react'

type Meal = { id: string; date: string; name: string }
type ShoppingItem = {
  id: string
  name: string
  quantity: string
  checked: boolean
  mealId: string
}

const ITEM_ACCENTS = [
  'border-violet-400',
  'border-pink-400',
  'border-amber-400',
  'border-teal-400',
  'border-sky-400',
  'border-rose-400',
]

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [mealId, setMealId] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [combineMode, setCombineMode] = useState(false)

  const loadItems = (from?: string, to?: string) => {
    const params = from && to ? `?from=${from}&to=${to}` : ''
    fetch(`/api/shopping${params}`).then(r => r.json()).then(setItems)
  }

  useEffect(() => {
    loadItems()
    fetch('/api/meals').then(r => r.json()).then(setMeals)
  }, [])

  const applyFilter = () => {
    if (filterFrom && filterTo) {
      loadItems(filterFrom, filterTo)
    } else {
      loadItems()
    }
  }

  const clearFilter = () => {
    setFilterFrom('')
    setFilterTo('')
    loadItems()
  }

  const addItem = async () => {
    if (!name.trim()) return
    const item: ShoppingItem = {
      id: `${Date.now()}`,
      name: name.trim(),
      quantity: qty.trim(),
      checked: false,
      mealId,
    }
    setItems(prev => [...prev, item])
    setName('')
    setQty('')
    setMealId('')
    await fetch('/api/shopping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
  }

  const toggle = async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    const checked = !item.checked
    setItems(prev => prev.map(i => (i.id === id ? { ...i, checked } : i)))
    await fetch(`/api/shopping/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked }),
    })
  }

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/shopping/${id}`, { method: 'DELETE' })
  }

  const clearChecked = async () => {
    const toDelete = items.filter(i => i.checked)
    setItems(prev => prev.filter(i => !i.checked))
    await Promise.all(toDelete.map(i => fetch(`/api/shopping/${i.id}`, { method: 'DELETE' })))
  }

  const mealLabel = (id: string) => {
    const m = meals.find(m => m.id === id)
    return m ? `${m.date} — ${m.name}` : ''
  }
  const mealOptions = meals.slice().sort((a, b) => a.date.localeCompare(b.date))

  // Combine duplicate items: group unchecked items by name (case-insensitive)
  const combinedUnchecked = useMemo(() => {
    const unchecked = items.filter(i => !i.checked)
    if (!combineMode) return null

    const map = new Map<string, { ids: string[]; quantity: string; mealIds: string[]; count: number }>()
    for (const item of unchecked) {
      const key = item.name.toLowerCase().trim()
      if (map.has(key)) {
        const existing = map.get(key)!
        existing.ids.push(item.id)
        existing.count++
        if (item.mealId) existing.mealIds.push(item.mealId)
        // Keep first non-empty quantity
        if (!existing.quantity && item.quantity) existing.quantity = item.quantity
      } else {
        map.set(key, {
          ids: [item.id],
          quantity: item.quantity,
          mealIds: item.mealId ? [item.mealId] : [],
          count: 1,
        })
      }
    }

    return Array.from(map.entries()).map(([key, val]) => ({
      key,
      displayName: unchecked.find(i => i.name.toLowerCase().trim() === key)?.name ?? key,
      ...val,
    }))
  }, [items, combineMode])

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const isFiltered = !!(filterFrom && filterTo)

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto animate-slide-up">

      {/* Header */}
      <h2
        className="text-3xl font-black mb-6"
        style={{
          background: 'linear-gradient(135deg, #EC4899, #F43F5E)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        🛒 Shopping List
      </h2>

      {/* Date filter */}
      <div
        className="rounded-2xl p-4 mb-4 shadow-sm border border-violet-100"
        style={{ background: 'linear-gradient(135deg, #faf5ff, #f5f3ff)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-black text-violet-600 uppercase tracking-wide">Filter by date</span>
          {isFiltered && (
            <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">
              {filterFrom} → {filterTo}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="flex-1 min-w-[130px] px-3 py-2 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80"
          />
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="flex-1 min-w-[130px] px-3 py-2 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80"
          />
          <button
            onClick={applyFilter}
            disabled={!filterFrom || !filterTo}
            className="px-4 py-2 text-white text-sm font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
          >
            Filter
          </button>
          {isFiltered && (
            <button
              onClick={clearFilter}
              className="px-4 py-2 bg-white/70 text-gray-500 text-sm font-bold rounded-xl border border-gray-200 hover:scale-105 transition-all"
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => setCombineMode(m => !m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              combineMode
                ? 'text-white shadow-md'
                : 'bg-white/70 text-gray-500 border border-gray-200'
            }`}
            style={combineMode ? { background: 'linear-gradient(135deg, #EC4899, #F43F5E)' } : {}}
          >
            <span>{combineMode ? '✓' : '○'}</span>
            Combine duplicates
          </button>
        </div>
      </div>

      {/* Add item form */}
      <div
        className="rounded-2xl p-4 mb-6 shadow-lg border border-pink-100"
        style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff1f5)' }}
      >
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Item name..."
            className="flex-1 px-3 py-2.5 border-2 border-pink-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-pink-400 bg-white/80"
          />
          <input
            value={qty}
            onChange={e => setQty(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Qty"
            className="w-20 px-3 py-2.5 border-2 border-pink-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-pink-400 bg-white/80"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={mealId}
            onChange={e => setMealId(e.target.value)}
            className="flex-1 px-3 py-2.5 border-2 border-pink-200 rounded-xl text-sm font-semibold text-gray-600 focus:outline-none focus:border-pink-400 bg-white/80"
          >
            <option value="">No meal</option>
            {mealOptions.map(m => (
              <option key={m.id} value={m.id}>
                {m.date} — {m.name}
              </option>
            ))}
          </select>
          <button
            onClick={addItem}
            className="px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
            style={{ background: 'linear-gradient(135deg, #EC4899, #F43F5E)' }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16 animate-bounce-in">
          <div className="text-6xl mb-4 animate-float">🛒</div>
          <p className="text-gray-500 font-bold text-lg">Your list is empty!</p>
          <p className="text-gray-400 text-sm mt-1">Add something above to get started.</p>
        </div>
      )}

      {/* Combined view */}
      {combineMode && combinedUnchecked && combinedUnchecked.length > 0 && (
        <ul className="space-y-2.5">
          {combinedUnchecked.map(({ key, displayName, ids, quantity, mealIds, count }, idx) => (
            <li
              key={key}
              className={`flex items-center gap-3 px-4 py-3.5 bg-white/80 rounded-2xl shadow-sm border-l-4 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${
                ITEM_ACCENTS[idx % ITEM_ACCENTS.length]
              }`}
            >
              <span className="flex-1 text-gray-800 font-semibold">{displayName}</span>
              {quantity && (
                <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                  {quantity}
                </span>
              )}
              {count > 1 && (
                <span className="text-xs font-black text-white bg-violet-500 px-2 py-0.5 rounded-full">
                  ×{count}
                </span>
              )}
              {mealIds.length > 0 && (
                <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 truncate max-w-[100px]">
                  {mealIds.length > 1 ? `${mealIds.length} meals` : mealLabel(mealIds[0])}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Normal (non-combined) unchecked items */}
      {!combineMode && (
        <ul className="space-y-2.5">
          {unchecked.map((item, idx) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3.5 bg-white/80 rounded-2xl shadow-sm border-l-4 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${
                ITEM_ACCENTS[idx % ITEM_ACCENTS.length]
              }`}
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggle(item.id)}
                className="w-5 h-5 cursor-pointer rounded accent-pink-500"
                style={{ accentColor: '#EC4899' }}
              />
              <span className="flex-1 text-gray-800 font-semibold">{item.name}</span>
              {item.quantity && (
                <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                  {item.quantity}
                </span>
              )}
              {item.mealId && (
                <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 truncate max-w-[100px]">
                  {mealLabel(item.mealId)}
                </span>
              )}
              <button
                onClick={() => remove(item.id)}
                className="text-gray-300 hover:text-red-400 text-xl leading-none transition-colors"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Checked / Done items */}
      {checked.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-black text-gray-400 uppercase tracking-wide">
              ✅ Done ({checked.length})
            </span>
            <button
              onClick={clearChecked}
              className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
            >
              Clear all
            </button>
          </div>
          <ul className="space-y-2">
            {checked.map(item => (
              <li
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 bg-gray-50/70 rounded-2xl border border-gray-100 opacity-60"
              >
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggle(item.id)}
                  className="w-5 h-5 cursor-pointer"
                  style={{ accentColor: '#EC4899' }}
                />
                <span className="flex-1 line-through text-gray-400 font-semibold">{item.name}</span>
                {item.quantity && (
                  <span className="text-xs text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">
                    {item.quantity}
                  </span>
                )}
                <button
                  onClick={() => remove(item.id)}
                  className="text-gray-300 hover:text-red-400 text-xl leading-none transition-colors"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
