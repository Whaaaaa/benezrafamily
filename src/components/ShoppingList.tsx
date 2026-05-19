'use client'

import { useState, useEffect } from 'react'

type Meal = { id: string; date: string; name: string }
type ShoppingItem = {
  id: string
  name: string
  quantity: string
  checked: boolean
  mealId: string
}

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [mealId, setMealId] = useState('')

  useEffect(() => {
    fetch('/api/shopping').then(r => r.json()).then(setItems)
    fetch('/api/meals').then(r => r.json()).then(setMeals)
  }, [])

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

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  const mealLabel = (id: string) => meals.find(m => m.id === id)?.name ?? ''

  const mealOptions = meals.slice().sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Shopping List</h2>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Item name..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={qty}
            onChange={e => setQty(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Qty"
            className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={mealId}
            onChange={e => setMealId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-center text-gray-400 py-10">Your shopping list is empty.</p>
      )}

      <ul className="space-y-2">
        {unchecked.map(item => (
          <li
            key={item.id}
            className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <input
              type="checkbox"
              checked={false}
              onChange={() => toggle(item.id)}
              className="w-5 h-5 accent-blue-600 cursor-pointer"
            />
            <span className="flex-1 text-gray-800">{item.name}</span>
            {item.quantity && (
              <span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {item.quantity}
              </span>
            )}
            {item.mealId && (
              <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded truncate max-w-[120px]">
                {mealLabel(item.mealId)}
              </span>
            )}
            <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-500 text-lg leading-none">
              ×
            </button>
          </li>
        ))}
      </ul>

      {checked.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-400">
              Done ({checked.length})
            </span>
            <button
              onClick={clearChecked}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Clear all
            </button>
          </div>
          <ul className="space-y-1.5">
            {checked.map(item => (
              <li
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg opacity-60"
              >
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggle(item.id)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
                <span className="flex-1 line-through text-gray-400">{item.name}</span>
                {item.quantity && (
                  <span className="text-sm text-gray-300 bg-gray-100 px-2 py-0.5 rounded">
                    {item.quantity}
                  </span>
                )}
                <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-500 text-lg leading-none">
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
