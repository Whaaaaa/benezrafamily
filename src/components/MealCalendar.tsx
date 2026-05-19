'use client'

import { useState, useEffect } from 'react'

type Meal = {
  id: string
  date: string
  name: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function MealCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [meals, setMeals] = useState<Meal[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [input, setInput] = useState('')

  useEffect(() => {
    fetch('/api/meals').then(r => r.json()).then(setMeals)
  }, [])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const addMeal = async () => {
    if (!selectedDate || !input.trim()) return
    const meal: Meal = { id: `${Date.now()}`, date: selectedDate, name: input.trim() }
    setMeals(prev => [...prev, meal])
    setInput('')
    await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meal),
    })
  }

  const removeMeal = async (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/meals/${id}`, { method: 'DELETE' })
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-100 text-gray-600"
        >
          ‹ Prev
        </button>
        <h2 className="text-xl font-semibold">{MONTHS[month]} {year}</h2>
        <button
          onClick={nextMonth}
          className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-100 text-gray-600"
        >
          Next ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
        {DAYS.map(d => (
          <div key={d} className="bg-gray-50 text-center text-xs font-semibold text-gray-500 uppercase py-2">
            {d}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`blank-${i}`} className="bg-white min-h-[90px]" />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dateStr = toDateStr(year, month, day)
          const dayMeals = meals.filter(m => m.date === dateStr)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate

          return (
            <div
              key={day}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`bg-white min-h-[90px] p-1.5 cursor-pointer transition-colors ${
                isSelected ? 'ring-2 ring-inset ring-blue-500' : 'hover:bg-blue-50'
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm mb-1 ${
                  isToday ? 'bg-blue-600 text-white font-bold' : 'text-gray-700'
                }`}
              >
                {day}
              </span>
              <div className="space-y-0.5">
                {dayMeals.map(meal => (
                  <div
                    key={meal.id}
                    className="flex items-center justify-between text-xs bg-emerald-100 text-emerald-800 rounded px-1 py-0.5"
                  >
                    <span className="truncate">{meal.name}</span>
                    <button
                      onClick={e => { e.stopPropagation(); removeMeal(meal.id) }}
                      className="ml-1 text-emerald-500 hover:text-emerald-800 flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <div className="mt-5 p-4 bg-white border border-blue-200 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Add meal for <span className="text-blue-600">{selectedDate}</span>
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMeal()}
              placeholder="e.g. Chicken stir fry"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addMeal}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
