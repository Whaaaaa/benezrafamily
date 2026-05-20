'use client'

import { useState, useEffect } from 'react'

type Meal = {
  id: string
  date: string
  name: string
}

type CalendarEvent = {
  id: string
  date: string
  title: string
  color: string
}

type Chug = {
  id: string
  name: string
  child: string
  days: string[]
  time: string
  monthlyCost: number
}

const CHUG_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CHILD_CHUG_COLORS: Record<string, string> = {
  Moony: 'bg-emerald-100 text-emerald-800',
  Moshe: 'bg-sky-100 text-sky-800',
  Pooki: 'bg-pink-100 text-pink-800',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DAY_COLORS = [
  'text-purple-600  bg-purple-50',
  'text-blue-600    bg-blue-50',
  'text-teal-600    bg-teal-50',
  'text-emerald-600 bg-emerald-50',
  'text-amber-600   bg-amber-50',
  'text-orange-600  bg-orange-50',
  'text-pink-600    bg-pink-50',
]

const MEAL_PILL_COLORS = [
  'bg-violet-100 text-violet-800',
  'bg-pink-100   text-pink-800',
  'bg-amber-100  text-amber-800',
  'bg-teal-100   text-teal-800',
  'bg-sky-100    text-sky-800',
  'bg-rose-100   text-rose-800',
]

const EVENT_COLORS: { value: string; bg: string; ring: string }[] = [
  { value: 'orange',  bg: 'bg-orange-500',  ring: 'ring-orange-400'  },
  { value: 'indigo',  bg: 'bg-indigo-500',  ring: 'ring-indigo-400'  },
  { value: 'cyan',    bg: 'bg-cyan-500',    ring: 'ring-cyan-400'    },
  { value: 'fuchsia', bg: 'bg-fuchsia-500', ring: 'ring-fuchsia-400' },
  { value: 'lime',    bg: 'bg-lime-500',    ring: 'ring-lime-400'    },
]

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function MealCalendar({ periodDates = [], chugim = [] }: { periodDates?: string[]; chugim?: Chug[] }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [meals, setMeals] = useState<Meal[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [addMode, setAddMode] = useState<'meal' | 'event'>('meal')
  const [mealInput, setMealInput] = useState('')
  const [eventInput, setEventInput] = useState('')
  const [eventColor, setEventColor] = useState('orange')

  useEffect(() => {
    fetch('/api/meals').then(r => r.json()).then(setMeals)
    fetch('/api/events').then(r => r.json()).then(setEvents)
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
    if (!selectedDate || !mealInput.trim()) return
    const meal: Meal = { id: `${Date.now()}`, date: selectedDate, name: mealInput.trim() }
    setMeals(prev => [...prev, meal])
    setMealInput('')
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

  const addEvent = async () => {
    if (!selectedDate || !eventInput.trim()) return
    const event: CalendarEvent = { id: `${Date.now()}`, date: selectedDate, title: eventInput.trim(), color: eventColor }
    setEvents(prev => [...prev, event])
    setEventInput('')
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  }

  const removeEvent = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-slide-up">

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="px-4 py-2 rounded-full font-bold text-white text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
        >
          ‹ Prev
        </button>

        <h2
          className="text-2xl font-black"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {MONTHS[month]} {year}
        </h2>

        <button
          onClick={nextMonth}
          className="px-4 py-2 rounded-full font-bold text-white text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
          style={{ background: 'linear-gradient(135deg, #EC4899, #F43F5E)' }}
        >
          Next ›
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl overflow-hidden shadow-xl border border-white/60 bg-white/60 backdrop-blur-sm">
        {/* Day headers */}
        <div className="grid grid-cols-7">
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-black py-2.5 uppercase tracking-wide ${DAY_COLORS[i]}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-px bg-purple-100/40">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`blank-${i}`} className="bg-white/40 min-h-[80px] sm:min-h-[100px]" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dateStr = toDateStr(year, month, day)
            const dayMeals = meals.filter(m => m.date === dateStr)
            const dayEvents = events.filter(e => e.date === dateStr)
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const isPeriod = periodDates.includes(dateStr)
            const dayOfWeek = CHUG_DOW[new Date(year, month, day).getDay()]
            const dayChugim = chugim.filter(c => c.days.includes(dayOfWeek))

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`bg-white min-h-[80px] sm:min-h-[100px] p-1.5 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'ring-2 ring-inset ring-violet-400 bg-violet-50'
                    : 'hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  {isToday ? (
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black text-white shadow-md"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                    >
                      {day}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-7 h-7 text-sm font-bold text-gray-600">
                      {day}
                    </span>
                  )}
                  {isPeriod && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 opacity-70 flex-shrink-0" />
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.map(event => {
                    const colorDef = EVENT_COLORS.find(c => c.value === event.color) ?? EVENT_COLORS[0]
                    return (
                      <div
                        key={event.id}
                        className={`flex items-center justify-between text-xs rounded-md px-1.5 py-0.5 font-bold text-white ${colorDef.bg}`}
                      >
                        <span className="truncate">✦ {event.title}</span>
                        <button
                          onClick={e => { e.stopPropagation(); removeEvent(event.id) }}
                          className="ml-1 opacity-60 hover:opacity-100 flex-shrink-0 leading-none"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                  {dayMeals.map((meal, mi) => (
                    <div
                      key={meal.id}
                      className={`flex items-center justify-between text-xs rounded-md px-1.5 py-0.5 font-semibold ${
                        MEAL_PILL_COLORS[mi % MEAL_PILL_COLORS.length]
                      }`}
                    >
                      <span className="truncate">{meal.name}</span>
                      <button
                        onClick={e => { e.stopPropagation(); removeMeal(meal.id) }}
                        className="ml-1 opacity-50 hover:opacity-100 flex-shrink-0 leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {dayChugim.map(chug => (
                    <div
                      key={chug.id}
                      className={`flex items-center gap-0.5 text-xs rounded-md px-1.5 py-0.5 font-semibold ${
                        CHILD_CHUG_COLORS[chug.child] ?? 'bg-violet-100 text-violet-800'
                      }`}
                    >
                      <span className="text-[10px]">🎽</span>
                      <span className="truncate">{chug.name}</span>
                      {chug.time && <span className="opacity-60 shrink-0 ml-0.5">{chug.time}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-400 font-semibold flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
          Events
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-violet-200 inline-block" />
          Meals
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 inline-block" />
          Chugim
        </span>
      </div>

      {/* Add panel */}
      {selectedDate && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDate(null)}
        >
        <div
          className="w-full max-w-md rounded-2xl p-4 shadow-2xl animate-bounce-in"
          style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Mode tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setAddMode('meal')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
                addMode === 'meal'
                  ? 'text-white shadow-md scale-105'
                  : 'text-gray-500 bg-white/70 hover:scale-105'
              }`}
              style={addMode === 'meal' ? { background: 'linear-gradient(135deg, #7C3AED, #EC4899)' } : {}}
            >
              🍴 Meal
            </button>
            <button
              onClick={() => setAddMode('event')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
                addMode === 'event'
                  ? 'text-white shadow-md scale-105'
                  : 'text-gray-500 bg-white/70 hover:scale-105'
              }`}
              style={addMode === 'event' ? { background: 'linear-gradient(135deg, #F97316, #D946EF)' } : {}}
            >
              ✦ Event
            </button>
          </div>

          <p className="text-sm font-bold text-gray-700 mb-3">
            {addMode === 'meal' ? '🍴 Add meal' : '✦ Add event'} for{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {selectedDate}
            </span>
          </p>

          {addMode === 'meal' ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={mealInput}
                onChange={e => setMealInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMeal()}
                placeholder="e.g. Chicken stir fry"
                className="flex-1 px-3 py-2 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80"
              />
              <button
                onClick={addMeal}
                className="px-5 py-2 text-white text-sm font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
              >
                Add
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={eventInput}
                  onChange={e => setEventInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEvent()}
                  placeholder="e.g. Doctor appointment"
                  className="flex-1 px-3 py-2 border-2 border-orange-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-orange-400 bg-white/80"
                />
                <button
                  onClick={addEvent}
                  className="px-5 py-2 text-white text-sm font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #F97316, #D946EF)' }}
                >
                  Add
                </button>
              </div>
              {/* Color picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Color:</span>
                {EVENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setEventColor(c.value)}
                    className={`w-6 h-6 rounded-full transition-all duration-150 hover:scale-110 ${c.bg} ${
                      eventColor === c.value ? `ring-2 ring-offset-1 ${c.ring} scale-110` : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  )
}
