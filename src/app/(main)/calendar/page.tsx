'use client'

import { useState, useEffect } from 'react'
import MealCalendar from '@/components/MealCalendar'

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

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function PeriodTracker({ periodDates, onChange }: {
  periodDates: string[]
  onChange: (dates: string[]) => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const toggleDate = async (dateStr: string) => {
    if (periodDates.includes(dateStr)) {
      onChange(periodDates.filter(d => d !== dateStr))
      await fetch(`/api/period/${dateStr}`, { method: 'DELETE' })
    } else {
      onChange([...periodDates, dateStr])
      await fetch('/api/period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      })
    }
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-slide-up">
      <p className="text-sm text-gray-500 font-semibold text-center mb-4">
        Tap days to mark them — they&apos;ll be quietly noted on your calendar.
      </p>

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
            background: 'linear-gradient(135deg, #EC4899, #F43F5E)',
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

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-rose-100/30">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`blank-${i}`} className="bg-white/40 min-h-[64px] sm:min-h-[80px]" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dateStr = toDateStr(year, month, day)
            const isToday = dateStr === todayStr
            const isMarked = periodDates.includes(dateStr)

            return (
              <button
                key={day}
                onClick={() => toggleDate(dateStr)}
                className={`min-h-[64px] sm:min-h-[80px] p-2 flex flex-col items-center justify-start gap-1 transition-all duration-150 w-full ${
                  isMarked
                    ? 'bg-rose-100 hover:bg-rose-200'
                    : 'bg-white hover:bg-rose-50'
                }`}
              >
                {isToday ? (
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black text-white shadow-md"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                  >
                    {day}
                  </span>
                ) : (
                  <span className={`inline-flex items-center justify-center w-7 h-7 text-sm font-bold ${isMarked ? 'text-rose-700' : 'text-gray-600'}`}>
                    {day}
                  </span>
                )}
                {isMarked && (
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 font-semibold">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
        <span>marked days</span>
      </div>
    </div>
  )
}

type Chug = {
  id: string
  name: string
  child: string
  days: string[]
  time: string
  monthlyCost: number
}

export default function CalendarPage() {
  const [tab, setTab] = useState<'meals' | 'period'>('meals')
  const [periodDates, setPeriodDates] = useState<string[]>([])
  const [chugim, setChugim] = useState<Chug[]>([])

  useEffect(() => {
    fetch('/api/period').then(r => r.json()).then(setPeriodDates)
    fetch('/api/budget/chugim').then(r => r.json()).then(setChugim)
  }, [])

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex gap-2 px-4 sm:px-6 pt-4 pb-0 max-w-4xl mx-auto">
        <button
          onClick={() => setTab('meals')}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold rounded-full transition-all duration-200 ${
            tab === 'meals'
              ? 'text-white shadow-lg scale-105'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/70 hover:scale-105'
          }`}
          style={tab === 'meals' ? { background: 'linear-gradient(135deg, #7C3AED, #EC4899)', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' } : {}}
        >
          🍽️ Meals
        </button>
        <button
          onClick={() => setTab('period')}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold rounded-full transition-all duration-200 ${
            tab === 'period'
              ? 'text-white shadow-lg scale-105'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/70 hover:scale-105'
          }`}
          style={tab === 'period' ? { background: 'linear-gradient(135deg, #EC4899, #F43F5E)', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' } : {}}
        >
          🌸 Cycle
        </button>
      </div>

      {tab === 'meals' && <MealCalendar periodDates={periodDates} chugim={chugim} />}
      {tab === 'period' && <PeriodTracker periodDates={periodDates} onChange={setPeriodDates} />}
    </div>
  )
}
