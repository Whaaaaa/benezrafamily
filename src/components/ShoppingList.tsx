'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

type Meal = { id: string; date: string; name: string; templateId: string }
type Ingredient = { id: string; name: string; quantity: string }
type MealTemplate = { id: string; name: string; ingredients: Ingredient[] }
type ShoppingItem = { id: string; name: string; quantity: string; checked: boolean; mealId: string }

const ITEM_ACCENTS = [
  'border-violet-400', 'border-pink-400', 'border-amber-400',
  'border-teal-400', 'border-sky-400', 'border-rose-400',
]

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`)
  return `${DOW[d.getDay()]}, ${dateStr}`
}

export default function ShoppingList() {
  const [tab, setTab] = useState<'plan' | 'list' | 'meals'>('plan')
  const [meals, setMeals] = useState<Meal[]>([])
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [items, setItems] = useState<ShoppingItem[]>([])

  // Plan tab
  const [selectedMealIds, setSelectedMealIds] = useState<Set<string>>(new Set())
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set())
  const [showPreview, setShowPreview] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Meals tab — editing existing
  const [templateEdits, setTemplateEdits] = useState<Record<string, Ingredient[]>>({})
  const [dirtyTemplates, setDirtyTemplates] = useState<Set<string>>(new Set())
  const [savingTemplates, setSavingTemplates] = useState<Set<string>>(new Set())
  const [newIngInputs, setNewIngInputs] = useState<Record<string, { name: string; qty: string }>>({})
  const newIngRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Meals tab — add new unscheduled meal
  const [showNewMealForm, setShowNewMealForm] = useState(false)
  const [newMealName, setNewMealName] = useState('')
  const [newMealIngredients, setNewMealIngredients] = useState<Ingredient[]>([])
  const [newMealIngName, setNewMealIngName] = useState('')
  const [newMealIngQty, setNewMealIngQty] = useState('')
  const [savingNewMeal, setSavingNewMeal] = useState(false)
  const newMealIngRef = useRef<HTMLInputElement>(null)
  const newMealNameRef = useRef<HTMLInputElement>(null)

  // List tab — manual add
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [mealId, setMealId] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/meals').then(r => r.json()),
      fetch('/api/meal-templates').then(r => r.json()),
      fetch('/api/shopping').then(r => r.json()),
    ]).then(([m, t, s]: [Meal[], MealTemplate[], ShoppingItem[]]) => {
      setMeals(m)
      setTemplates(t)
      setItems(s)
      const edits: Record<string, Ingredient[]> = {}
      for (const tmpl of t) edits[tmpl.id] = [...tmpl.ingredients]
      setTemplateEdits(edits)
    })
  }, [])

  useEffect(() => {
    setTemplateEdits(prev => {
      const next = { ...prev }
      for (const tmpl of templates) {
        if (!(tmpl.id in next)) next[tmpl.id] = [...tmpl.ingredients]
      }
      return next
    })
  }, [templates])

  const allIngredientNames = useMemo(() =>
    Array.from(new Set(templates.flatMap(t => t.ingredients.map(i => i.name)))).sort()
  , [templates])

  const mealsByDate = useMemo(() => {
    const map = new Map<string, Meal[]>()
    for (const meal of meals) {
      const arr = map.get(meal.date) ?? []
      map.set(meal.date, [...arr, meal])
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)))
  }, [meals])

  // Templates not linked to any calendar meal
  const libraryTemplates = useMemo(() => {
    const scheduledIds = new Set(meals.map(m => m.templateId).filter(Boolean))
    return templates.filter(t => !scheduledIds.has(t.id))
  }, [meals, templates])

  // ── Plan tab ────────────────────────────────────────────────────

  const applyDateFilter = () => {
    if (!filterFrom || !filterTo) return
    setSelectedMealIds(new Set(
      meals.filter(m => m.date >= filterFrom && m.date <= filterTo).map(m => m.id)
    ))
  }

  const toggleMeal = (id: string) =>
    setSelectedMealIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleExpand = (id: string) =>
    setExpandedMeals(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const combinedIngredients = useMemo(() => {
    const map = new Map<string, { displayName: string; quantity: string; fromMeals: string[]; count: number }>()
    for (const meal of meals.filter(m => selectedMealIds.has(m.id))) {
      const template = templates.find(t => t.id === meal.templateId)
      if (!template) continue
      for (const ing of template.ingredients) {
        const key = ing.name.toLowerCase().trim()
        if (map.has(key)) { const e = map.get(key)!; e.fromMeals.push(meal.name); e.count++ }
        else map.set(key, { displayName: ing.name, quantity: ing.quantity, fromMeals: [meal.name], count: 1 })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [meals, templates, selectedMealIds])

  const selectedCount = selectedMealIds.size
  const duplicateCount = combinedIngredients.filter(i => i.count > 1).length

  const generateList = async () => {
    if (combinedIngredients.length === 0 || generating) return
    setGenerating(true)
    const selectedMealsArr = meals.filter(m => selectedMealIds.has(m.id))
    const newItems: ShoppingItem[] = combinedIngredients.map(ing => {
      const linkedMeal = selectedMealsArr.find(meal => {
        const tmpl = templates.find(t => t.id === meal.templateId)
        return tmpl?.ingredients.some(i => i.name.toLowerCase().trim() === ing.displayName.toLowerCase().trim())
      })
      return { id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: ing.displayName, quantity: ing.quantity, checked: false, mealId: linkedMeal?.id ?? '' }
    })
    await Promise.all(newItems.map(item =>
      fetch('/api/shopping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
    ))
    setItems(prev => [...prev, ...newItems])
    setGenerating(false)
    setTab('list')
  }

  // ── Meals tab — editing ─────────────────────────────────────────

  const getIngInput = (key: string) => newIngInputs[key] ?? { name: '', qty: '' }
  const setIngInput = (key: string, field: 'name' | 'qty', value: string) =>
    setNewIngInputs(prev => ({ ...prev, [key]: { ...getIngInput(key), [field]: value } }))

  const addIngredientToMeal = (templateId: string) => {
    const { name: ingName, qty: ingQty } = getIngInput(templateId)
    if (!ingName.trim()) return
    const newIng: Ingredient = { id: `ing-${Date.now()}`, name: ingName.trim(), quantity: ingQty.trim() }
    setTemplateEdits(prev => ({ ...prev, [templateId]: [...(prev[templateId] ?? []), newIng] }))
    setDirtyTemplates(prev => new Set(prev).add(templateId))
    setNewIngInputs(prev => ({ ...prev, [templateId]: { name: '', qty: '' } }))
    setTimeout(() => newIngRefs.current[templateId]?.focus(), 0)
  }

  const removeIngredient = (templateId: string, ingId: string) => {
    setTemplateEdits(prev => ({ ...prev, [templateId]: (prev[templateId] ?? []).filter(i => i.id !== ingId) }))
    setDirtyTemplates(prev => new Set(prev).add(templateId))
  }

  const saveTemplateById = async (templateId: string, mealForLink?: Meal) => {
    const ingredients = templateEdits[templateId] ?? []
    setSavingTemplates(prev => new Set(prev).add(templateId))

    if (mealForLink && !mealForLink.templateId) {
      // No template yet — create one and link to the calendar meal
      await fetch('/api/meal-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, name: mealForLink.name, ingredients }),
      })
      await fetch(`/api/meals/${mealForLink.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      setMeals(prev => prev.map(m => m.id === mealForLink.id ? { ...m, templateId } : m))
      setTemplates(prev => [...prev, { id: templateId, name: mealForLink.name, ingredients }])
    } else {
      await fetch(`/api/meal-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
      })
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, ingredients } : t))
    }

    setDirtyTemplates(prev => { const n = new Set(prev); n.delete(templateId); return n })
    setSavingTemplates(prev => { const n = new Set(prev); n.delete(templateId); return n })
  }

  const deleteMeal = async (mealId: string) => {
    setMeals(prev => prev.filter(m => m.id !== mealId))
    await fetch(`/api/meals/${mealId}`, { method: 'DELETE' })
  }

  const deleteTemplate = async (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId))
    setTemplateEdits(prev => { const n = { ...prev }; delete n[templateId]; return n })
    await fetch(`/api/meal-templates/${templateId}`, { method: 'DELETE' })
  }

  // ── Meals tab — new unscheduled meal ────────────────────────────

  const addNewMealIngredient = () => {
    if (!newMealIngName.trim()) return
    setNewMealIngredients(prev => [...prev, { id: `ing-${Date.now()}`, name: newMealIngName.trim(), quantity: newMealIngQty.trim() }])
    setNewMealIngName('')
    setNewMealIngQty('')
    setTimeout(() => newMealIngRef.current?.focus(), 0)
  }

  const saveNewMeal = async () => {
    if (!newMealName.trim() || savingNewMeal) return
    setSavingNewMeal(true)
    const templateId = `tmpl-${Date.now()}`
    await fetch('/api/meal-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: templateId, name: newMealName.trim(), ingredients: newMealIngredients }),
    })
    setTemplates(prev => [...prev, { id: templateId, name: newMealName.trim(), ingredients: newMealIngredients }])
    setTemplateEdits(prev => ({ ...prev, [templateId]: [...newMealIngredients] }))
    setNewMealName('')
    setNewMealIngredients([])
    setNewMealIngName('')
    setNewMealIngQty('')
    setShowNewMealForm(false)
    setSavingNewMeal(false)
  }

  // ── List tab ────────────────────────────────────────────────────

  const addItem = async () => {
    if (!name.trim()) return
    const item: ShoppingItem = { id: `${Date.now()}`, name: name.trim(), quantity: qty.trim(), checked: false, mealId }
    setItems(prev => [...prev, item])
    setName(''); setQty(''); setMealId('')
    await fetch('/api/shopping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
  }

  const toggle = async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    const checked = !item.checked
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked } : i))
    await fetch(`/api/shopping/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checked }) })
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
  const mealOptions = [...meals].sort((a, b) => a.date.localeCompare(b.date))

  // ── Shared: editable meal card ──────────────────────────────────

  const MealCard = ({ templateId, title, onDelete, meal }: {
    templateId: string
    title: string
    onDelete: () => void
    meal?: Meal
  }) => {
    const ingredients = templateEdits[templateId] ?? []
    const isDirty = dirtyTemplates.has(templateId)
    const isSaving = savingTemplates.has(templateId)
    const input = getIngInput(templateId)

    return (
      <div className="rounded-2xl border border-emerald-100 bg-white/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-50"
          style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' }}>
          <span className="font-black text-gray-800">{title}</span>
          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                onClick={() => saveTemplateById(templateId, meal)}
                disabled={isSaving}
                className="px-3 py-1 text-xs font-bold text-white rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            )}
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all text-base"
              title="Delete"
            >
              🗑
            </button>
          </div>
        </div>

        <div className="px-4 pt-3 pb-3">
          {ingredients.length === 0 && (
            <p className="text-xs text-gray-400 italic mb-2">No ingredients yet.</p>
          )}
          <ul className="space-y-1 mb-3">
            {ingredients.map(ing => (
              <li key={ing.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="flex-1 text-sm font-semibold text-gray-700">{ing.name}</span>
                {ing.quantity && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {ing.quantity}
                  </span>
                )}
                <button
                  onClick={() => removeIngredient(templateId, ing.id)}
                  className="text-gray-300 hover:text-red-400 text-lg leading-none transition-colors flex-shrink-0"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <div className="flex gap-1.5">
            <input
              ref={el => { newIngRefs.current[templateId] = el }}
              list="sl-ingredient-names"
              value={input.name}
              onChange={e => setIngInput(templateId, 'name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIngredientToMeal(templateId)}
              placeholder="Add ingredient…"
              className="flex-1 px-3 py-1.5 border-2 border-emerald-100 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-400 bg-white/80"
            />
            <input
              value={input.qty}
              onChange={e => setIngInput(templateId, 'qty', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIngredientToMeal(templateId)}
              placeholder="Qty"
              className="w-16 px-2 py-1.5 border-2 border-emerald-100 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-400 bg-white/80"
            />
            <button
              onClick={() => addIngredientToMeal(templateId)}
              className="px-3 py-1.5 text-white text-sm font-bold rounded-xl shadow hover:scale-105 transition-all"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}
            >
              +
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto animate-slide-up">
      <datalist id="sl-ingredient-names">
        {allIngredientNames.map(n => <option key={n} value={n} />)}
      </datalist>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('plan')}
          className={`flex-1 py-2.5 rounded-2xl text-sm font-black transition-all duration-200 ${tab === 'plan' ? 'text-white shadow-lg' : 'bg-white/70 text-gray-500'}`}
          style={tab === 'plan' ? { background: 'linear-gradient(135deg, #7C3AED, #EC4899)' } : {}}>
          🍽 Planner
        </button>
        <button onClick={() => setTab('meals')}
          className={`flex-1 py-2.5 rounded-2xl text-sm font-black transition-all duration-200 ${tab === 'meals' ? 'text-white shadow-lg' : 'bg-white/70 text-gray-500'}`}
          style={tab === 'meals' ? { background: 'linear-gradient(135deg, #059669, #10B981)' } : {}}>
          🥕 Meals
        </button>
        <button onClick={() => setTab('list')}
          className={`flex-1 py-2.5 rounded-2xl text-sm font-black transition-all duration-200 relative ${tab === 'list' ? 'text-white shadow-lg' : 'bg-white/70 text-gray-500'}`}
          style={tab === 'list' ? { background: 'linear-gradient(135deg, #EC4899, #F43F5E)' } : {}}>
          🛒 List
          {unchecked.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
              {unchecked.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── PLAN TAB ─── */}
      {tab === 'plan' && (
        <div>
          <div className="rounded-2xl p-4 mb-5 border border-violet-100 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #faf5ff, #f5f3ff)' }}>
            <p className="text-xs font-black text-violet-600 uppercase tracking-wide mb-2">Select by date range</p>
            <div className="flex gap-2 flex-wrap">
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                className="flex-1 min-w-[130px] px-3 py-2 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80" />
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                className="flex-1 min-w-[130px] px-3 py-2 border-2 border-violet-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-violet-400 bg-white/80" />
              <button onClick={applyDateFilter} disabled={!filterFrom || !filterTo}
                className="px-4 py-2 text-white text-sm font-bold rounded-xl shadow-md hover:scale-105 transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
                Select
              </button>
            </div>
            <div className="flex gap-3 mt-2.5">
              <button onClick={() => setSelectedMealIds(new Set(meals.map(m => m.id)))}
                className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">Select all</button>
              <span className="text-gray-300 text-xs">·</span>
              <button onClick={() => setSelectedMealIds(new Set())}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">Clear</button>
            </div>
          </div>

          {meals.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-bold">No meals on the calendar yet.</div>
          ) : (
            <div className="space-y-6 mb-5">
              {Array.from(mealsByDate.entries()).map(([date, dayMeals]) => (
                <div key={date}>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5">{formatDate(date)}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {dayMeals.map(meal => {
                      const template = templates.find(t => t.id === meal.templateId)
                      const ingCount = template?.ingredients.length ?? 0
                      const isSelected = selectedMealIds.has(meal.id)
                      const isExpanded = expandedMeals.has(meal.id)
                      return (
                        <div key={meal.id} className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${isSelected ? 'border-violet-400 bg-violet-50 shadow-md' : 'border-gray-100 bg-white/70'}`}>
                          <button onClick={() => toggleMeal(meal.id)} className="w-full p-3 text-left">
                            <div className="flex items-start gap-2">
                              <span className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center text-[10px] font-black transition-all ${isSelected ? 'bg-violet-500 border-violet-500 text-white' : 'border-gray-300'}`}>
                                {isSelected && '✓'}
                              </span>
                              <span className="font-bold text-sm text-gray-800 leading-tight">{meal.name}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5 ml-6 font-semibold">
                              {ingCount > 0 ? `${ingCount} ingredient${ingCount !== 1 ? 's' : ''}` : 'No ingredients'}
                            </p>
                          </button>
                          {ingCount > 0 && (
                            <div className="px-3 pb-2.5">
                              <button onClick={() => toggleExpand(meal.id)} className="text-[10px] font-bold text-violet-400 hover:text-violet-600 transition-colors">
                                {isExpanded ? '▲ hide' : '▼ show'}
                              </button>
                              {isExpanded && (
                                <ul className="mt-1.5 space-y-0.5">
                                  {template!.ingredients.map(ing => (
                                    <li key={ing.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                                      <span className="w-1 h-1 rounded-full bg-violet-300 flex-shrink-0" />
                                      {ing.name}{ing.quantity ? ` — ${ing.quantity}` : ''}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedCount > 0 && (
            <div className="rounded-2xl border border-pink-100 shadow-lg overflow-hidden sticky bottom-4"
              style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff1f5)' }}>
              <div className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-gray-800">
                    {combinedIngredients.length} ingredient{combinedIngredients.length !== 1 ? 's' : ''}
                    {duplicateCount > 0 && <span className="ml-2 text-xs font-bold text-violet-500 bg-violet-100 px-1.5 py-0.5 rounded-full">{duplicateCount} combined</span>}
                  </p>
                  <p className="text-xs text-gray-400 font-semibold">{selectedCount} meal{selectedCount !== 1 ? 's' : ''} selected</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowPreview(p => !p)} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                    {showPreview ? '▲' : '▼ preview'}
                  </button>
                  <button onClick={generateList} disabled={generating || combinedIngredients.length === 0}
                    className="px-5 py-2 text-white text-sm font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #F43F5E)' }}>
                    {generating ? 'Adding…' : `Add ${combinedIngredients.length} to list →`}
                  </button>
                </div>
              </div>
              {showPreview && combinedIngredients.length > 0 && (
                <ul className="border-t border-pink-100 divide-y divide-pink-50 max-h-64 overflow-y-auto">
                  {combinedIngredients.map((ing, idx) => (
                    <li key={idx} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="flex-1 text-sm font-semibold text-gray-700">{ing.displayName}</span>
                      {ing.quantity && <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">{ing.quantity}</span>}
                      {ing.count > 1
                        ? <span className="text-xs font-black text-white bg-violet-500 px-2 py-0.5 rounded-full">×{ing.count}</span>
                        : <span className="text-[11px] text-gray-300 font-semibold truncate max-w-[80px]">{ing.fromMeals[0]}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── MEALS TAB ─── */}
      {tab === 'meals' && (
        <div className="space-y-6">

          {/* Add new meal form */}
          {showNewMealForm ? (
            <div className="rounded-2xl border-2 border-emerald-300 bg-white/90 shadow-md overflow-hidden">
              <div className="px-4 py-3 border-b border-emerald-100 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }}>
                <span className="font-black text-emerald-800">New Meal</span>
                <button onClick={() => { setShowNewMealForm(false); setNewMealName(''); setNewMealIngredients([]); setNewMealIngName(''); setNewMealIngQty('') }}
                  className="text-emerald-400 hover:text-emerald-700 text-xl leading-none transition-colors">×</button>
              </div>
              <div className="px-4 pt-3 pb-4 space-y-3">
                <input
                  ref={newMealNameRef}
                  autoFocus
                  value={newMealName}
                  onChange={e => setNewMealName(e.target.value)}
                  placeholder="Meal name…"
                  className="w-full px-3 py-2 border-2 border-emerald-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-400 bg-white/80"
                />

                {newMealIngredients.length > 0 && (
                  <ul className="space-y-1">
                    {newMealIngredients.map(ing => (
                      <li key={ing.id} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span className="flex-1 text-sm font-semibold text-gray-700">{ing.name}</span>
                        {ing.quantity && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{ing.quantity}</span>}
                        <button onClick={() => setNewMealIngredients(p => p.filter(i => i.id !== ing.id))}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none transition-colors">×</button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-1.5">
                  <input
                    ref={newMealIngRef}
                    list="sl-ingredient-names"
                    value={newMealIngName}
                    onChange={e => setNewMealIngName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNewMealIngredient()}
                    placeholder="Add ingredient…"
                    className="flex-1 px-3 py-1.5 border-2 border-emerald-100 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-400 bg-white/80"
                  />
                  <input
                    value={newMealIngQty}
                    onChange={e => setNewMealIngQty(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNewMealIngredient()}
                    placeholder="Qty"
                    className="w-16 px-2 py-1.5 border-2 border-emerald-100 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-400 bg-white/80"
                  />
                  <button onClick={addNewMealIngredient}
                    className="px-3 py-1.5 text-white text-sm font-bold rounded-xl shadow hover:scale-105 transition-all"
                    style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>+</button>
                </div>

                <button
                  onClick={saveNewMeal}
                  disabled={!newMealName.trim() || savingNewMeal}
                  className="w-full py-2 text-white text-sm font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
                  {savingNewMeal ? 'Saving…' : 'Save Meal'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setShowNewMealForm(true); setTimeout(() => newMealNameRef.current?.focus(), 0) }}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-200 text-emerald-600 font-bold text-sm hover:border-emerald-400 hover:bg-emerald-50 transition-all"
            >
              + Add New Meal
            </button>
          )}

          {/* Scheduled meals grouped by date */}
          {Array.from(mealsByDate.entries()).map(([date, dayMeals]) => (
            <div key={date}>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{formatDate(date)}</p>
              <div className="space-y-3">
                {dayMeals.map(meal => {
                  const templateId = meal.templateId || `new-${meal.id}`
                  return (
                    <MealCard
                      key={meal.id}
                      templateId={meal.templateId || `new-${meal.id}`}
                      title={meal.name}
                      meal={!meal.templateId ? meal : undefined}
                      onDelete={() => deleteMeal(meal.id)}
                    />
                  )
                })}
              </div>
            </div>
          ))}

          {/* Meal library — unscheduled templates */}
          {libraryTemplates.length > 0 && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Meal Library</p>
              <div className="space-y-3">
                {libraryTemplates.map(tmpl => (
                  <MealCard
                    key={tmpl.id}
                    templateId={tmpl.id}
                    title={tmpl.name}
                    onDelete={() => deleteTemplate(tmpl.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {meals.length === 0 && templates.length === 0 && !showNewMealForm && (
            <p className="text-center text-gray-400 font-bold py-8">No meals yet. Add one above!</p>
          )}
        </div>
      )}

      {/* ─── LIST TAB ─── */}
      {tab === 'list' && (
        <div>
          <div className="rounded-2xl p-4 mb-6 shadow-lg border border-pink-100"
            style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff1f5)' }}>
            <div className="flex gap-2 mb-3">
              <input autoFocus value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="Item name..."
                className="flex-1 px-3 py-2.5 border-2 border-pink-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-pink-400 bg-white/80" />
              <input value={qty} onChange={e => setQty(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="Qty"
                className="w-20 px-3 py-2.5 border-2 border-pink-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-pink-400 bg-white/80" />
            </div>
            <div className="flex gap-2">
              <select value={mealId} onChange={e => setMealId(e.target.value)}
                className="flex-1 px-3 py-2.5 border-2 border-pink-200 rounded-xl text-sm font-semibold text-gray-600 focus:outline-none focus:border-pink-400 bg-white/80">
                <option value="">No meal</option>
                {mealOptions.map(m => <option key={m.id} value={m.id}>{m.date} — {m.name}</option>)}
              </select>
              <button onClick={addItem}
                className="px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
                style={{ background: 'linear-gradient(135deg, #EC4899, #F43F5E)' }}>
                Add
              </button>
            </div>
          </div>

          {items.length === 0 && (
            <div className="text-center py-16 animate-bounce-in">
              <div className="text-6xl mb-4 animate-float">🛒</div>
              <p className="text-gray-500 font-bold text-lg">Your list is empty!</p>
              <p className="text-gray-400 text-sm mt-1">
                Use <button onClick={() => setTab('plan')} className="text-violet-500 underline font-bold">Meal Planner</button> to generate one.
              </p>
            </div>
          )}

          <ul className="space-y-2.5">
            {unchecked.map((item, idx) => (
              <li key={item.id}
                className={`flex items-center gap-3 px-4 py-3.5 bg-white/80 rounded-2xl shadow-sm border-l-4 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${ITEM_ACCENTS[idx % ITEM_ACCENTS.length]}`}>
                <input type="checkbox" checked={false} onChange={() => toggle(item.id)}
                  className="w-5 h-5 cursor-pointer rounded" style={{ accentColor: '#EC4899' }} />
                <span className="flex-1 text-gray-800 font-semibold">{item.name}</span>
                {item.quantity && <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">{item.quantity}</span>}
                {item.mealId && <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 truncate max-w-[100px]">{mealLabel(item.mealId)}</span>}
                <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-400 text-xl leading-none transition-colors">×</button>
              </li>
            ))}
          </ul>

          {checked.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-black text-gray-400 uppercase tracking-wide">✅ Done ({checked.length})</span>
                <button onClick={clearChecked} className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors">Clear all</button>
              </div>
              <ul className="space-y-2">
                {checked.map(item => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50/70 rounded-2xl border border-gray-100 opacity-60">
                    <input type="checkbox" checked={true} onChange={() => toggle(item.id)} className="w-5 h-5 cursor-pointer" style={{ accentColor: '#EC4899' }} />
                    <span className="flex-1 line-through text-gray-400 font-semibold">{item.name}</span>
                    {item.quantity && <span className="text-xs text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">{item.quantity}</span>}
                    <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-400 text-xl leading-none transition-colors">×</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
