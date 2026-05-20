'use client'

import { useState, useEffect, useRef } from 'react'

type Meal = {
  id: string
  date: string
  name: string
  templateId: string
}

type Ingredient = {
  id: string
  name: string
  quantity: string
}

type MealTemplate = {
  id: string
  name: string
  ingredients: Ingredient[]
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
  const [holidays, setHolidays] = useState<Record<string, string[]>>({})
  const [templates, setTemplates] = useState<MealTemplate[]>([])

  // Day click / add modal
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [addMode, setAddMode] = useState<'meal' | 'event'>('meal')
  const [mealInput, setMealInput] = useState('')
  const [eventInput, setEventInput] = useState('')
  const [eventColor, setEventColor] = useState('orange')

  // Post-add ingredient flow
  const [postAddMeal, setPostAddMeal] = useState<Meal | null>(null)
  const [postAddStep, setPostAddStep] = useState<'decide' | 'addIngredients'>('decide')
  const [newIngName, setNewIngName] = useState('')
  const [newIngQty, setNewIngQty] = useState('')
  const [pendingIngredients, setPendingIngredients] = useState<Ingredient[]>([])
  const ingInputRef = useRef<HTMLInputElement>(null)

  // Ingredient view for existing meal
  const [viewMeal, setViewMeal] = useState<Meal | null>(null)
  const [viewIngName, setViewIngName] = useState('')
  const [viewIngQty, setViewIngQty] = useState('')
  const [viewPendingIngs, setViewPendingIngs] = useState<Ingredient[]>([])
  const viewIngRef = useRef<HTMLInputElement>(null)

  const [seedDone, setSeedDone] = useState(false)

  useEffect(() => {
    setSeedDone(!!localStorage.getItem('holiday-seeded-v2'))
    fetch('/api/meals').then(r => r.json()).then(setMeals)
    fetch('/api/events').then(r => r.json()).then(setEvents)
    fetch('/api/meal-templates').then(r => r.json()).then(setTemplates)
  }, [])

  const runSeed = async () => {
    await fetch('/api/seed', { method: 'POST' })
    localStorage.setItem('holiday-seeded-v2', '1')
    setSeedDone(true)
    const [newMeals, newEvents, newTemplates] = await Promise.all([
      fetch('/api/meals').then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
      fetch('/api/meal-templates').then(r => r.json()),
    ])
    setMeals(newMeals)
    setEvents(newEvents)
    setTemplates(newTemplates)
    // Navigate to May 2026 where the seeded meals live
    setYear(2026)
    setMonth(4) // May is index 4
  }

  useEffect(() => {
    fetch(
      `https://www.hebcal.com/hebcal/?v=1&cfg=json&year=${year}&month=${month + 1}&maj=on&min=off&nx=off&mf=off&ss=off&mod=on&i=on&lg=s`
    )
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string[]> = {}
        for (const item of data.items ?? []) {
          if (item.category === 'holiday' || item.category === 'modern') {
            const date = item.date.slice(0, 10)
            const title = (item.title as string).replace(/\s+\d{4}$/, '')
            if (!map[date]) map[date] = []
            map[date].push(title)
          }
        }
        setHolidays(map)
      })
      .catch(() => {})
  }, [year, month])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // All unique ingredient names across all templates (for datalist autocomplete)
  const allIngredientNames = Array.from(
    new Set(templates.flatMap(t => t.ingredients.map(i => i.name)))
  ).sort()

  const findTemplate = (name: string) =>
    templates.find(t => t.name.toLowerCase() === name.trim().toLowerCase()) ?? null

  const addMeal = async () => {
    if (!selectedDate || !mealInput.trim()) return
    const trimmedName = mealInput.trim()
    const matchedTemplate = findTemplate(trimmedName)
    const templateId = matchedTemplate?.id ?? ''

    const meal: Meal = {
      id: `${Date.now()}`,
      date: selectedDate,
      name: trimmedName,
      templateId,
    }
    setMeals(prev => [...prev, meal])
    setMealInput('')

    await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meal),
    })

    // Trigger post-add flow
    setPostAddMeal(meal)
    setPostAddStep('decide')
    setPendingIngredients([])
    setNewIngName('')
    setNewIngQty('')
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

  // Add ingredients to shopping list directly
  const addIngredientsToShopping = async (meal: Meal, ings: Ingredient[]) => {
    const template = templates.find(t => t.id === meal.templateId)
    const ingredientsToAdd = ings.length > 0 ? ings : (template?.ingredients ?? [])
    await Promise.all(
      ingredientsToAdd.map(ing =>
        fetch('/api/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `${Date.now()}-${Math.random()}`,
            name: ing.name,
            quantity: ing.quantity,
            checked: false,
            mealId: meal.id,
          }),
        })
      )
    )
  }

  // Save newly created/updated template and link to meal
  const saveTemplateAndLink = async (meal: Meal, ings: Ingredient[], addToShopping: boolean) => {
    const existingTemplate = findTemplate(meal.name)
    let templateId = existingTemplate?.id ?? ''

    if (ings.length > 0) {
      if (!templateId) {
        templateId = `tmpl-${Date.now()}`
        await fetch('/api/meal-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: templateId, name: meal.name, ingredients: ings }),
        })
        setTemplates(prev => [...prev, { id: templateId, name: meal.name, ingredients: ings }])
      } else {
        // Merge new ingredients into existing template
        const merged = [...(existingTemplate?.ingredients ?? []), ...ings]
        await fetch(`/api/meal-templates/${templateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredients: merged }),
        })
        setTemplates(prev =>
          prev.map(t => t.id === templateId ? { ...t, ingredients: merged } : t)
        )
      }

      // Link meal to template
      await fetch(`/api/meals/${meal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, templateId } : m))

      if (addToShopping) {
        await addIngredientsToShopping({ ...meal, templateId }, ings)
      }
    }
  }

  // Close the post-add flow
  const closePostAdd = () => {
    setPostAddMeal(null)
    setPendingIngredients([])
    setNewIngName('')
    setNewIngQty('')
  }

  // Close ingredient view modal
  const closeViewMeal = () => {
    setViewMeal(null)
    setViewPendingIngs([])
    setViewIngName('')
    setViewIngQty('')
  }

  const addPendingIngredient = (
    nameState: string, qtyState: string,
    setter: (ings: Ingredient[]) => void,
    currentIngs: Ingredient[],
    clearName: () => void, clearQty: () => void,
    focusRef: React.RefObject<HTMLInputElement | null>
  ) => {
    if (!nameState.trim()) return
    const ing: Ingredient = { id: `ing-${Date.now()}`, name: nameState.trim(), quantity: qtyState.trim() }
    setter([...currentIngs, ing])
    clearName()
    clearQty()
    setTimeout(() => focusRef.current?.focus(), 0)
  }

  const removePendingIngredient = (
    idx: number,
    currentIngs: Ingredient[],
    setter: (ings: Ingredient[]) => void
  ) => {
    setter(currentIngs.filter((_, i) => i !== idx))
  }

  // Open ingredient view for an existing meal
  const openViewMeal = (meal: Meal, e: React.MouseEvent) => {
    e.stopPropagation()
    const template = templates.find(t => t.id === meal.templateId)
    setViewMeal(meal)
    setViewPendingIngs(template?.ingredients ?? [])
    setViewIngName('')
    setViewIngQty('')
    setSelectedDate(null)
  }

  const saveViewIngredients = async (addToShopping: boolean) => {
    if (!viewMeal) return
    await saveTemplateAndLink(viewMeal, viewPendingIngs, addToShopping)
    closeViewMeal()
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const postAddTemplate = postAddMeal ? findTemplate(postAddMeal.name) : null
  const hasExistingIngredients = (postAddTemplate?.ingredients.length ?? 0) > 0

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-slide-up">

      {/* Shavuot seed banner */}
      {!seedDone && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm">
          <span className="text-sm font-bold text-amber-700">✡ Load Shavuot & Shabbos meals for June 2026?</span>
          <div className="flex gap-2">
            <button
              onClick={runSeed}
              className="px-4 py-1.5 text-white text-xs font-bold rounded-xl shadow hover:scale-105 transition-all"
              style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
            >
              Load
            </button>
            <button
              onClick={() => { localStorage.setItem('holiday-seeded-v2', '1'); setSeedDone(true) }}
              className="px-3 py-1.5 text-amber-600 text-xs font-bold rounded-xl bg-white border border-amber-200 hover:scale-105 transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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
            const dayHolidays = holidays[dateStr] ?? []
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
                  {dayHolidays.map(h => (
                    <div
                      key={h}
                      className="text-xs rounded-md px-1.5 py-0.5 font-bold truncate bg-amber-100 text-amber-800 border border-amber-300"
                    >
                      ✡ {h}
                    </div>
                  ))}
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
                  {dayMeals.map((meal, mi) => {
                    const hasTemplate = !!meal.templateId
                    return (
                      <div
                        key={meal.id}
                        className={`flex items-center justify-between text-xs rounded-md px-1.5 py-0.5 font-semibold ${
                          MEAL_PILL_COLORS[mi % MEAL_PILL_COLORS.length]
                        }`}
                      >
                        <button
                          onClick={e => openViewMeal(meal, e)}
                          className="truncate text-left flex items-center gap-0.5 hover:underline"
                          title="View / edit ingredients"
                        >
                          {hasTemplate && <span className="opacity-60 text-[9px]">🥕</span>}
                          <span className="truncate">{meal.name}</span>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); removeMeal(meal.id) }}
                          className="ml-1 opacity-50 hover:opacity-100 flex-shrink-0 leading-none"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
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
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-300 inline-block" />
          Holidays
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
          Events
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-violet-200 inline-block" />
          Meals
        </span>
        <span className="flex items-center gap-1.5">
          <span className="opacity-60 text-[10px]">🥕</span>
          Has ingredients
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 inline-block" />
          Chugim
        </span>
      </div>

      {/* Ingredient datalists */}
      <datalist id="meal-names">
        {templates.map(t => <option key={t.id} value={t.name} />)}
      </datalist>
      <datalist id="ingredient-names">
        {allIngredientNames.map(n => <option key={n} value={n} />)}
      </datalist>

      {/* ── Add meal/event panel ── */}
      {selectedDate && !postAddMeal && (
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
                  list="meal-names"
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

      {/* ── Post-add ingredient decision modal ── */}
      {postAddMeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-2xl animate-bounce-in"
            style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)' }}
          >
            <p className="text-base font-black text-gray-800 mb-1">
              Added <span className="text-violet-600">{postAddMeal.name}</span>
            </p>
            <p className="text-xs text-gray-500 mb-4">{postAddMeal.date}</p>

            {postAddStep === 'decide' && (
              <>
                {hasExistingIngredients ? (
                  <>
                    <p className="text-sm font-semibold text-gray-600 mb-4">
                      This meal has <strong>{postAddTemplate!.ingredients.length}</strong> ingredient{postAddTemplate!.ingredients.length !== 1 ? 's' : ''} saved.
                      Add them to your shopping list?
                    </p>
                    <ul className="mb-4 space-y-1">
                      {postAddTemplate!.ingredients.map(i => (
                        <li key={i.id} className="text-xs text-gray-500 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                          {i.name}{i.quantity ? ` — ${i.quantity}` : ''}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await addIngredientsToShopping(postAddMeal, [])
                          closePostAdd()
                          setSelectedDate(null)
                        }}
                        className="flex-1 py-2 text-white text-sm font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                        style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                      >
                        Yes, add to shopping
                      </button>
                      <button
                        onClick={() => { closePostAdd(); setSelectedDate(null) }}
                        className="px-4 py-2 bg-white/70 text-gray-600 text-sm font-bold rounded-xl border border-gray-200 hover:scale-105 transition-all"
                      >
                        Skip
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-600 mb-4">
                      No ingredient list for this meal yet. Add one now?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setPostAddStep('addIngredients'); setTimeout(() => ingInputRef.current?.focus(), 0) }}
                        className="flex-1 py-2 text-white text-sm font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                        style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                      >
                        Add ingredients
                      </button>
                      <button
                        onClick={() => { closePostAdd(); setSelectedDate(null) }}
                        className="px-4 py-2 bg-white/70 text-gray-600 text-sm font-bold rounded-xl border border-gray-200 hover:scale-105 transition-all"
                      >
                        Skip
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {postAddStep === 'addIngredients' && (
              <>
                <p className="text-sm font-semibold text-gray-600 mb-3">
                  Add ingredients for <span className="text-violet-600 font-bold">{postAddMeal.name}</span>:
                </p>

                {/* Ingredient input */}
                <div className="flex gap-2 mb-3">
                  <input
                    ref={ingInputRef}
                    list="ingredient-names"
                    value={newIngName}
                    onChange={e => setNewIngName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addPendingIngredient(
                      newIngName, newIngQty,
                      setPendingIngredients, pendingIngredients,
                      () => setNewIngName(''), () => setNewIngQty(''),
                      ingInputRef
                    )}
                    placeholder="Ingredient name..."
                    className="flex-1 px-3 py-2 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80"
                  />
                  <input
                    value={newIngQty}
                    onChange={e => setNewIngQty(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addPendingIngredient(
                      newIngName, newIngQty,
                      setPendingIngredients, pendingIngredients,
                      () => setNewIngName(''), () => setNewIngQty(''),
                      ingInputRef
                    )}
                    placeholder="Qty"
                    className="w-20 px-3 py-2 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80"
                  />
                  <button
                    onClick={() => addPendingIngredient(
                      newIngName, newIngQty,
                      setPendingIngredients, pendingIngredients,
                      () => setNewIngName(''), () => setNewIngQty(''),
                      ingInputRef
                    )}
                    className="px-3 py-2 text-white text-sm font-bold rounded-xl shadow-md hover:scale-105 transition-all"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                  >
                    +
                  </button>
                </div>

                {/* Pending ingredients list */}
                {pendingIngredients.length > 0 && (
                  <ul className="mb-3 space-y-1 max-h-40 overflow-y-auto">
                    {pendingIngredients.map((ing, idx) => (
                      <li key={ing.id} className="flex items-center gap-2 text-sm text-gray-700 bg-white/60 rounded-lg px-3 py-1.5">
                        <span className="flex-1 font-semibold">{ing.name}</span>
                        {ing.quantity && <span className="text-xs text-violet-600 font-bold">{ing.quantity}</span>}
                        <button
                          onClick={() => removePendingIngredient(idx, pendingIngredients, setPendingIngredients)}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={async () => {
                      await saveTemplateAndLink(postAddMeal, pendingIngredients, true)
                      closePostAdd()
                      setSelectedDate(null)
                    }}
                    disabled={pendingIngredients.length === 0}
                    className="flex-1 py-2 text-white text-sm font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                  >
                    Save & add to shopping
                  </button>
                  <button
                    onClick={async () => {
                      await saveTemplateAndLink(postAddMeal, pendingIngredients, false)
                      closePostAdd()
                      setSelectedDate(null)
                    }}
                    disabled={pendingIngredients.length === 0}
                    className="px-4 py-2 bg-white/70 text-gray-600 text-sm font-bold rounded-xl border border-gray-200 hover:scale-105 transition-all disabled:opacity-40"
                  >
                    Save only
                  </button>
                  <button
                    onClick={() => { closePostAdd(); setSelectedDate(null) }}
                    className="px-3 py-2 text-gray-400 text-sm font-bold rounded-xl hover:text-gray-600 transition-all"
                  >
                    Skip
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── View / edit ingredients for existing meal ── */}
      {viewMeal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeViewMeal}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-2xl animate-bounce-in"
            style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-base font-black text-gray-800">{viewMeal.name}</p>
                <p className="text-xs text-gray-400">{viewMeal.date}</p>
              </div>
              <button onClick={closeViewMeal} className="text-gray-300 hover:text-gray-500 text-2xl leading-none ml-2">×</button>
            </div>

            <p className="text-xs font-bold text-violet-500 uppercase tracking-wide mb-3 mt-3">Ingredients</p>

            {/* Ingredient input */}
            <div className="flex gap-2 mb-3">
              <input
                ref={viewIngRef}
                list="ingredient-names"
                value={viewIngName}
                onChange={e => setViewIngName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPendingIngredient(
                  viewIngName, viewIngQty,
                  setViewPendingIngs, viewPendingIngs,
                  () => setViewIngName(''), () => setViewIngQty(''),
                  viewIngRef
                )}
                placeholder="Ingredient name..."
                className="flex-1 px-3 py-2 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80"
              />
              <input
                value={viewIngQty}
                onChange={e => setViewIngQty(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPendingIngredient(
                  viewIngName, viewIngQty,
                  setViewPendingIngs, viewPendingIngs,
                  () => setViewIngName(''), () => setViewIngQty(''),
                  viewIngRef
                )}
                placeholder="Qty"
                className="w-20 px-3 py-2 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80"
              />
              <button
                onClick={() => addPendingIngredient(
                  viewIngName, viewIngQty,
                  setViewPendingIngs, viewPendingIngs,
                  () => setViewIngName(''), () => setViewIngQty(''),
                  viewIngRef
                )}
                className="px-3 py-2 text-white text-sm font-bold rounded-xl shadow-md hover:scale-105 transition-all"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
              >
                +
              </button>
            </div>

            {viewPendingIngs.length > 0 ? (
              <ul className="mb-4 space-y-1 max-h-44 overflow-y-auto">
                {viewPendingIngs.map((ing, idx) => (
                  <li key={ing.id} className="flex items-center gap-2 text-sm text-gray-700 bg-white/60 rounded-lg px-3 py-1.5">
                    <span className="flex-1 font-semibold">{ing.name}</span>
                    {ing.quantity && <span className="text-xs text-violet-600 font-bold">{ing.quantity}</span>}
                    <button
                      onClick={() => removePendingIngredient(idx, viewPendingIngs, setViewPendingIngs)}
                      className="text-gray-300 hover:text-red-400 text-lg leading-none"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic mb-4">No ingredients yet — add some above.</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => saveViewIngredients(true)}
                className="flex-1 py-2 text-white text-sm font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
              >
                Save & add to shopping
              </button>
              <button
                onClick={() => saveViewIngredients(false)}
                className="px-4 py-2 bg-white/70 text-gray-600 text-sm font-bold rounded-xl border border-gray-200 hover:scale-105 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
