'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import MapTab from './MapTab'
import { getPushState, enablePush, disablePush, pushDebugInfo, type PushState } from './push-client'

type Customer = { id: string; name: string; phone: string; address: string; created_at: string }
type ClassType = { id: string; name: string }
type Job = {
  id: string; customer_id: string; customer_name: string; customer_phone: string; customer_address: string
  notes: string; first_hour_rate: number; additional_hour_rate: number; created_at: string; completed_at?: string | null
}
type JobEvent = { id: string; job_id: string; start_time: string; end_time: string; series_id?: string | null; subject?: string }
type SchoolClass = {
  id: string; class_type_id: string; class_type_name: string
  duration_hours: number; start_time: string; end_time: string; notes: string; series_id?: string | null
}
type Assignment = {
  id: string; class_id: string; subject: string; notes: string; due_at: string
  reminders_enabled: boolean; class_type_name: string; class_start_time: string
}
type Tab = 'calendar' | 'jobs' | 'classes' | 'customers' | 'map'
type CalView = 'day' | 'week' | 'month'
type Modal = 'newJob' | 'addEvent' | 'newClass' | 'eventDetail' | 'classDetail' | 'completeJob' | 'newAssignment' | 'assignmentDetail' | 'editEvent' | 'editClass' | null

const DAY_START = 7
const DAY_END = 21
const SLOT_H = 36
const WEEK_SLOT_H = 20

function uid() { return crypto.randomUUID() }

function costFromMinutes(mins: number, firstRate: number, addRate: number): number {
  const hours = mins / 60
  if (hours <= 0) return 0
  if (hours <= 1) return Number(firstRate)
  return Number(firstRate) + (hours - 1) * Number(addRate)
}

function calcCost(startTime: string, endTime: string, firstRate: number, addRate: number): number {
  const mins = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
  return costFromMinutes(mins, firstRate, addRate)
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type RecurState = {
  repeat: boolean
  freq: 'daily' | 'weekly' | 'monthly'
  interval: number
  weekdays: number[]
  endMode: 'count' | 'date'
  count: number
  endDate: string
}

function defaultRecur(): RecurState {
  return { repeat: false, freq: 'weekly', interval: 1, weekdays: [], endMode: 'count', count: 4, endDate: '' }
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfWeek(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

// Generate the list of occurrence dates (YYYY-MM-DD) for a recurrence pattern.
function generateDates(r: RecurState, start: string): string[] {
  const out: string[] = []
  if (!start) return out
  const startD = new Date(`${start}T00:00:00`)
  if (isNaN(startD.getTime())) return out
  const MAX = 200
  const interval = Math.max(1, Math.floor(r.interval) || 1)
  const endD = r.endMode === 'date' && r.endDate ? new Date(`${r.endDate}T00:00:00`) : null

  if (r.freq === 'monthly') {
    for (let i = 0; out.length < MAX && i < 600; i++) {
      const d = new Date(startD)
      d.setMonth(d.getMonth() + i * interval)
      if (endD && d > endD) break
      out.push(dateStr(d))
      if (r.endMode === 'count' && out.length >= r.count) break
    }
    return out
  }

  if (r.freq === 'daily') {
    const cursor = new Date(startD)
    for (let i = 0; out.length < MAX && i < 1000; i++) {
      if (endD && cursor > endD) break
      out.push(dateStr(cursor))
      if (r.endMode === 'count' && out.length >= r.count) break
      cursor.setDate(cursor.getDate() + interval)
    }
    return out
  }

  // weekly (optionally on multiple weekdays)
  const wk = r.weekdays.length ? [...r.weekdays].sort((a, b) => a - b) : [startD.getDay()]
  const baseWeek = startOfWeek(startD)
  const cursor = new Date(startD)
  for (let guard = 0; out.length < MAX && guard < 3000; guard++) {
    if (endD && cursor > endD) break
    const weekIdx = Math.round((startOfWeek(cursor).getTime() - baseWeek.getTime()) / (7 * 86400000))
    if (weekIdx % interval === 0 && wk.includes(cursor.getDay())) {
      out.push(dateStr(cursor))
      if (r.endMode === 'count' && out.length >= r.count) break
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

function RecurrenceControls({ value, onChange, accent }: {
  value: RecurState
  onChange: (v: RecurState) => void
  accent: 'teal' | 'purple'
}) {
  const A = accent === 'teal'
    ? { on: 'bg-teal-600 text-white', ring: 'focus:ring-teal-300', soft: 'text-teal-600', border: 'border-teal-300' }
    : { on: 'bg-purple-600 text-white', ring: 'focus:ring-purple-300', soft: 'text-purple-600', border: 'border-purple-300' }
  const set = (patch: Partial<RecurState>) => onChange({ ...value, ...patch })

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Repeat</label>
        <button onClick={() => set({ repeat: !value.repeat })}
          className={`relative w-11 h-6 rounded-full transition-colors ${value.repeat ? (accent === 'teal' ? 'bg-teal-600' : 'bg-purple-600') : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value.repeat ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      {value.repeat && (
        <div className="mt-3 space-y-3 bg-gray-50 rounded-xl p-3">
          {/* Frequency */}
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map(f => (
              <button key={f} onClick={() => set({ freq: f })}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize ${value.freq === f ? A.on : 'bg-white text-gray-600 border border-gray-200'}`}>
                {f}
              </button>
            ))}
          </div>

          {/* Interval */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Every</span>
            <input type="number" min={1} value={value.interval}
              onChange={e => set({ interval: Math.max(1, Number(e.target.value)) })}
              className={`w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 ${A.ring}`} />
            <span className="text-xs text-gray-500">{value.freq === 'daily' ? 'day(s)' : value.freq === 'weekly' ? 'week(s)' : 'month(s)'}</span>
          </div>

          {/* Weekdays (weekly only) */}
          {value.freq === 'weekly' && (
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">On days (defaults to start day)</label>
              <div className="flex gap-1">
                {WEEKDAYS.map((d, i) => {
                  const sel = value.weekdays.includes(i)
                  return (
                    <button key={i}
                      onClick={() => set({ weekdays: sel ? value.weekdays.filter(x => x !== i) : [...value.weekdays, i] })}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold ${sel ? A.on : 'bg-white text-gray-500 border border-gray-200'}`}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* End condition */}
          <div>
            <div className="flex gap-2 mb-2">
              <button onClick={() => set({ endMode: 'count' })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${value.endMode === 'count' ? A.on : 'bg-white text-gray-600 border border-gray-200'}`}>
                # of times
              </button>
              <button onClick={() => set({ endMode: 'date' })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${value.endMode === 'date' ? A.on : 'bg-white text-gray-600 border border-gray-200'}`}>
                End date
              </button>
            </div>
            {value.endMode === 'count' ? (
              <div className="flex items-center gap-2">
                <input type="number" min={1} value={value.count}
                  onChange={e => set({ count: Math.max(1, Number(e.target.value)) })}
                  className={`w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 ${A.ring}`} />
                <span className="text-xs text-gray-500">occurrences</span>
              </div>
            ) : (
              <input type="date" value={value.endDate} onChange={e => set({ endDate: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 ${A.ring}`} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ValidationErrors({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
      {errors.map((e, i) => (
        <p key={i} className="text-sm font-semibold text-red-700">⚠ {e}</p>
      ))}
    </div>
  )
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IL', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IL', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtDayFull(d: Date) {
  return d.toLocaleDateString('en-IL', { weekday: 'long', month: 'long', day: 'numeric' })
}

function isoFromParts(date: string, time: string) {
  return `${date}T${time}:00`
}

function addMinutes(isoOrTime: string, date: string, minutes: number) {
  const combined = `${date}T${isoOrTime}:00`
  const d = new Date(combined)
  d.setMinutes(d.getMinutes() + minutes)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function dateFromIso(iso: string) {
  return iso.slice(0, 10)
}

function timeFromIso(iso: string) {
  return iso.slice(11, 16)
}

function isSameDay(d: Date, iso: string) {
  const ev = new Date(iso)
  return d.getFullYear() === ev.getFullYear() && d.getMonth() === ev.getMonth() && d.getDate() === ev.getDate()
}

function timeToPixel(isoOrHHMM: string, slotH = SLOT_H) {
  const t = isoOrHHMM.length > 5 ? isoOrHHMM : `2000-01-01T${isoOrHHMM}:00`
  const d = new Date(t)
  const h = d.getHours()
  const m = d.getMinutes()
  return ((h - DAY_START) * 60 + m) / 30 * slotH
}

function durationToPixels(startIso: string, endIso: string, slotH = SLOT_H) {
  const mins = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
  return (mins / 30) * slotH
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d
  })
}

// 6-week grid covering the month that `anchor` falls in.
function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d
  })
}

const TIMES: string[] = []
for (let h = DAY_START; h < DAY_END; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`)
  TIMES.push(`${String(h).padStart(2, '0')}:30`)
}
const TOTAL_SLOTS = (DAY_END - DAY_START) * 2

export default function AviadminPage() {
  const [tab, setTab] = useState<Tab>('calendar')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab') as Tab
    if (t && ['calendar', 'jobs', 'classes', 'customers', 'map'].includes(t)) setTab(t)
  }, [])
  const [calDate, setCalDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })

  const [calView, setCalView] = useState<CalView>('day')
  const [filters, setFilters] = useState({ jobs: true, classes: true, assignments: true })

  const [customers, setCustomers] = useState<Customer[]>([])
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobEvents, setJobEvents] = useState<JobEvent[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [modal, setModal] = useState<Modal>(null)
  const [selectedJobEvent, setSelectedJobEvent] = useState<JobEvent | null>(null)
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [addEventJobId, setAddEventJobId] = useState('')

  // ── Push notifications ──
  const [pushState, setPushState] = useState<PushState>('disabled')
  const [pushBusy, setPushBusy] = useState(false)

  // ── Alert / confirm dialogs ──
  const [alertMsg, setAlertMsg] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void | Promise<void> } | null>(null)

  // ── New Assignment form ──
  const [asgClassId, setAsgClassId] = useState('')
  const [asgSubject, setAsgSubject] = useState('')
  const [asgNotes, setAsgNotes] = useState('')
  const [asgDate, setAsgDate] = useState(todayStr())
  const [asgTime, setAsgTime] = useState('17:00')
  const [asgReminders, setAsgReminders] = useState(true)

  // ── New Job form ──
  const [custMode, setCustMode] = useState<'new' | 'existing'>('new')
  const [custSearch, setCustSearch] = useState('')
  const [custId, setCustId] = useState('')
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [custAddress, setCustAddress] = useState('')
  const [jobFirstRate, setJobFirstRate] = useState(250)
  const [jobAddRate, setJobAddRate] = useState(150)
  const [jobNotes, setJobNotes] = useState('')
  const [jobSlots, setJobSlots] = useState([{ date: todayStr(), start: '09:00', end: '10:00', subject: '' }])
  const [jobRecur, setJobRecur] = useState<RecurState>(defaultRecur())
  const [jobReminders, setJobReminders] = useState(true)

  // ── Complete job form ──
  const [completeJobId, setCompleteJobId] = useState('')
  const [compHours, setCompHours] = useState(1)
  const [compMins, setCompMins] = useState(0)

  // ── Add Event form ──
  const [evDate, setEvDate] = useState(todayStr())
  const [evStart, setEvStart] = useState('09:00')
  const [evEnd, setEvEnd] = useState('10:00')
  const [evSubject, setEvSubject] = useState('')

  // ── New Class form ──
  const [clTypeId, setClTypeId] = useState('')
  const [clNewTypeName, setClNewTypeName] = useState('')
  const [clShowNewType, setClShowNewType] = useState(false)
  const [clDuration, setClDuration] = useState<1.5 | 3>(1.5)
  const [clDate, setClDate] = useState(todayStr())
  const [clStart, setClStart] = useState('09:00')
  const [clNotes, setClNotes] = useState('')
  const [clRecur, setClRecur] = useState<RecurState>(defaultRecur())
  const [clReminders, setClReminders] = useState(true)

  // ── Customer filter ──
  const [custFilter, setCustFilter] = useState('')

  // ── Day view compact ──
  const [dayCollapsed, setDayCollapsed] = useState(true)

  // ── Classes tab expanded groups ──
  const [expandedClassTypes, setExpandedClassTypes] = useState<Set<string>>(new Set())

  // ── Edit Event form ──
  const [editEventId, setEditEventId] = useState('')
  const [editEventDate, setEditEventDate] = useState(todayStr())
  const [editEventStart, setEditEventStart] = useState('09:00')
  const [editEventEnd, setEditEventEnd] = useState('10:00')
  const [editEventSubject, setEditEventSubject] = useState('')

  // ── Edit Class form ──
  const [editClassId, setEditClassId] = useState('')
  const [editClassTypeId, setEditClassTypeId] = useState('')
  const [editClassDate, setEditClassDate] = useState(todayStr())
  const [editClassStart, setEditClassStart] = useState('09:00')
  const [editClassDuration, setEditClassDuration] = useState<1.5 | 3>(1.5)
  const [editClassNotes, setEditClassNotes] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [c, ct, j, je, cl, asg] = await Promise.all([
        fetch('/api/aviadmin/customers').then(r => r.json()),
        fetch('/api/aviadmin/class-types').then(r => r.json()),
        fetch('/api/aviadmin/jobs').then(r => r.json()),
        fetch('/api/aviadmin/job-events').then(r => r.json()),
        fetch('/api/aviadmin/classes').then(r => r.json()),
        fetch('/api/aviadmin/assignments').then(r => r.json()),
      ])
      setCustomers(Array.isArray(c) ? c : [])
      setClassTypes(Array.isArray(ct) ? ct : [])
      setJobs(Array.isArray(j) ? j : [])
      setJobEvents(Array.isArray(je) ? je : [])
      setClasses(Array.isArray(cl) ? cl : [])
      setAssignments(Array.isArray(asg) ? asg : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => { getPushState().then(setPushState) }, [])

  async function handleTogglePush() {
    setPushBusy(true)
    try {
      if (pushState === 'enabled') {
        setPushState(await disablePush())
      } else {
        const next = await enablePush()
        setPushState(next)
        if (next === 'unconfigured') {
          setAlertMsg('Push notifications are not configured on the server yet (VAPID keys missing).')
        } else if (next === 'denied') {
          setAlertMsg('Notifications are blocked. Enable them in your browser settings for this site.')
        }
      }
    } finally {
      setPushBusy(false)
    }
  }

  function resetJobForm() {
    setCustMode('new'); setCustSearch(''); setCustId(''); setCustName(''); setCustPhone(''); setCustAddress('')
    setJobFirstRate(250); setJobAddRate(150); setJobNotes('')
    setJobSlots([{ date: todayStr(), start: '09:00', end: '10:00', subject: '' }])
    setJobRecur(defaultRecur()); setJobReminders(true)
  }

  function resetClassForm() {
    setClTypeId(''); setClNewTypeName(''); setClShowNewType(false)
    setClDuration(1.5); setClDate(todayStr()); setClStart('09:00'); setClNotes('')
    setClRecur(defaultRecur()); setClReminders(true)
  }

  function openNewAssignment(classId: string) {
    const cl = classes.find(c => c.id === classId)
    setAsgClassId(classId)
    setAsgSubject(''); setAsgNotes('')
    setAsgDate(cl ? cl.start_time.slice(0, 10) : todayStr())
    setAsgTime('17:00'); setAsgReminders(true)
    setModal('newAssignment')
  }

  async function handleSaveAssignment() {
    if (!asgClassId || !asgSubject.trim() || !asgDate) return
    setSaving(true)
    try {
      await fetch('/api/aviadmin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: uid(), class_id: asgClassId, subject: asgSubject.trim(), notes: asgNotes,
          due_at: isoFromParts(asgDate, asgTime), reminders_enabled: asgReminders, created_at: new Date().toISOString(),
        }),
      })
      await fetchAll()
      setModal('classDetail')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAssignment(id: string) {
    await fetch(`/api/aviadmin/assignments/${id}`, { method: 'DELETE' })
    await fetchAll()
    setModal(selectedClass ? 'classDetail' : null)
  }

  async function handleSaveJob() {
    if (custMode === 'new' && !custName.trim()) return
    if (custMode === 'existing' && !custId) return
    setSaving(true)
    try {
      let finalCustId = custId
      if (custMode === 'new') {
        finalCustId = uid()
        await fetch('/api/aviadmin/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: finalCustId, name: custName.trim(), phone: custPhone.trim(), address: custAddress.trim(), created_at: new Date().toISOString() }),
        })
      }
      const jobId = uid()
      await fetch('/api/aviadmin/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, customer_id: finalCustId, notes: jobNotes, first_hour_rate: jobFirstRate, additional_hour_rate: jobAddRate, created_at: new Date().toISOString() }),
      })
      if (jobRecur.repeat) {
        const seriesId = uid()
        const base = jobSlots[0]
        const dates = generateDates(jobRecur, base.date)
        for (const date of dates) {
          if (!base.start || !base.end) continue
          await fetch('/api/aviadmin/job-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: uid(), job_id: jobId, start_time: isoFromParts(date, base.start), end_time: isoFromParts(date, base.end), series_id: seriesId, reminders_enabled: jobReminders, subject: base.subject ?? '' }),
          })
        }
      } else {
        for (const slot of jobSlots) {
          if (!slot.date || !slot.start || !slot.end) continue
          await fetch('/api/aviadmin/job-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: uid(), job_id: jobId, start_time: isoFromParts(slot.date, slot.start), end_time: isoFromParts(slot.date, slot.end), reminders_enabled: jobReminders, subject: slot.subject ?? '' }),
          })
        }
      }
      await fetchAll()
      setModal(null)
      resetJobForm()
    } finally {
      setSaving(false)
    }
  }

  async function handleAddEvent() {
    if (!addEventJobId || !evDate || !evStart || !evEnd) return
    setSaving(true)
    try {
      await fetch('/api/aviadmin/job-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uid(), job_id: addEventJobId, start_time: isoFromParts(evDate, evStart), end_time: isoFromParts(evDate, evEnd), subject: evSubject }),
      })
      await fetchAll()
      setModal(null)
    } finally {
      setSaving(false)
    }
  }

  function openComplete(jobId: string) {
    const evs = jobEvents.filter(e => e.job_id === jobId)
    const mins = evs.reduce((s, e) => s + (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 60000, 0)
    const safe = mins > 0 ? mins : 60
    setCompleteJobId(jobId)
    setCompHours(Math.floor(safe / 60))
    setCompMins(Math.round(safe % 60))
    setModal('completeJob')
  }

  async function handleCompleteJob() {
    const job = jobs.find(j => j.id === completeJobId)
    if (!job) return
    const totalMins = compHours * 60 + compMins
    const amount = costFromMinutes(totalMins, job.first_hour_rate, job.additional_hour_rate)
    const now = new Date().toISOString()
    setSaving(true)
    try {
      await fetch(`/api/aviadmin/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: job.notes, first_hour_rate: job.first_hour_rate, additional_hour_rate: job.additional_hour_rate, completed_at: now }),
      })
      await fetch('/api/aviadmin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: uid(), job_id: job.id, customer_id: job.customer_id, amount, total_minutes: totalMins,
          description: job.notes?.trim() || 'Work completed', created_at: now,
        }),
      })
      await fetchAll()
      setModal(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveClass() {
    let typeId = clTypeId
    if (clShowNewType && clNewTypeName.trim()) {
      typeId = uid()
      await fetch('/api/aviadmin/class-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: typeId, name: clNewTypeName.trim() }),
      })
    }
    if (!typeId || !clDate || !clStart) return
    setSaving(true)
    try {
      const dates = clRecur.repeat ? generateDates(clRecur, clDate) : [clDate]
      const seriesId = clRecur.repeat ? uid() : null
      for (const date of dates) {
        const endTime = addMinutes(clStart, date, clDuration * 60)
        await fetch('/api/aviadmin/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: uid(), class_type_id: typeId, duration_hours: clDuration, start_time: isoFromParts(date, clStart), end_time: isoFromParts(date, endTime), notes: clNotes, series_id: seriesId, reminders_enabled: clReminders }),
        })
      }
      await fetchAll()
      setModal(null)
      resetClassForm()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteJobEvent(id: string) {
    await fetch(`/api/aviadmin/job-events/${id}`, { method: 'DELETE' })
    await fetchAll()
    setModal(null)
  }

  async function handleDeleteClass(id: string) {
    await fetch(`/api/aviadmin/classes/${id}`, { method: 'DELETE' })
    await fetchAll()
    setModal(null)
  }

  function handleDeleteJob(id: string) {
    setConfirmDialog({
      message: 'Delete this job and all its sessions?',
      onConfirm: async () => {
        await fetch(`/api/aviadmin/jobs/${id}`, { method: 'DELETE' })
        await fetchAll()
      },
    })
  }

  function handleDeleteCustomer(id: string) {
    setConfirmDialog({
      message: 'Delete this client and all their jobs, sessions, and invoices?',
      onConfirm: async () => {
        await fetch(`/api/aviadmin/customers/${id}`, { method: 'DELETE' })
        await fetchAll()
      },
    })
  }

  function openAddEvent(jobId: string) {
    setAddEventJobId(jobId)
    setEvDate(todayStr())
    setEvStart('09:00')
    setEvEnd('10:00')
    setEvSubject('')
    setModal('addEvent')
  }

  function openEditEvent(ev: JobEvent) {
    setEditEventId(ev.id)
    setEditEventDate(dateFromIso(ev.start_time))
    setEditEventStart(timeFromIso(ev.start_time))
    setEditEventEnd(timeFromIso(ev.end_time))
    setEditEventSubject(ev.subject ?? '')
    setModal('editEvent')
  }

  async function handleUpdateEvent() {
    if (!editEventId || !editEventDate || !editEventStart || !editEventEnd) return
    setSaving(true)
    try {
      await fetch(`/api/aviadmin/job-events/${editEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: isoFromParts(editEventDate, editEventStart),
          end_time: isoFromParts(editEventDate, editEventEnd),
          subject: editEventSubject,
        }),
      })
      await fetchAll()
      setModal(null)
    } finally {
      setSaving(false)
    }
  }

  function openEditClass(cl: SchoolClass) {
    setEditClassId(cl.id)
    setEditClassTypeId(cl.class_type_id)
    setEditClassDate(dateFromIso(cl.start_time))
    setEditClassStart(timeFromIso(cl.start_time))
    setEditClassDuration(cl.duration_hours as 1.5 | 3)
    setEditClassNotes(cl.notes)
    setModal('editClass')
  }

  async function handleUpdateClass() {
    if (!editClassId || !editClassDate || !editClassStart) return
    setSaving(true)
    try {
      const endTime = addMinutes(editClassStart, editClassDate, editClassDuration * 60)
      await fetch(`/api/aviadmin/classes/${editClassId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_type_id: editClassTypeId,
          duration_hours: editClassDuration,
          start_time: isoFromParts(editClassDate, editClassStart),
          end_time: isoFromParts(editClassDate, endTime),
          notes: editClassNotes,
        }),
      })
      await fetchAll()
      setModal(null)
    } finally {
      setSaving(false)
    }
  }

  // ── Calendar data (respecting type filters) ─────────────────────────
  const calJobEvents = filters.jobs ? jobEvents : []
  const calClasses = filters.classes ? classes : []
  const calAssignments = filters.assignments ? assignments : []
  const jobsOn = (d: Date) => calJobEvents.filter(e => isSameDay(d, e.start_time))
  const classesOn = (d: Date) => calClasses.filter(c => isSameDay(d, c.start_time))
  const asgOn = (d: Date) => calAssignments.filter(a => isSameDay(d, a.due_at))

  function shiftCal(dir: number) {
    const d = new Date(calDate)
    if (calView === 'day') d.setDate(d.getDate() + dir)
    else if (calView === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCalDate(d)
  }

  function calTitle() {
    if (calView === 'day') return fmtDayFull(calDate)
    if (calView === 'week') {
      const days = weekDays(calDate)
      const a = days[0], b = days[6]
      return `${a.toLocaleDateString('en-IL', { month: 'short', day: 'numeric' })} – ${b.toLocaleDateString('en-IL', { month: 'short', day: 'numeric' })}`
    }
    return calDate.toLocaleDateString('en-IL', { month: 'long', year: 'numeric' })
  }

  function renderJobBlock(ev: JobEvent, totalH: number, opts?: { compact?: boolean; slotH?: number }, topOffset = 0) {
    const sh = opts?.slotH ?? SLOT_H
    const job = jobs.find(j => j.id === ev.job_id)
    const top = timeToPixel(ev.start_time, sh) - topOffset
    const h = durationToPixels(ev.start_time, ev.end_time, sh)
    if (top + h < 0 || top >= totalH) return null
    const cost = calcCost(ev.start_time, ev.end_time, job?.first_hour_rate ?? 250, job?.additional_hour_rate ?? 150)
    return (
      <button key={ev.id} onClick={() => { setSelectedJobEvent(ev); setModal('eventDetail') }}
        className="absolute left-0.5 right-0.5 bg-teal-50 border-l-4 border-teal-500 rounded-r-lg p-1 text-left overflow-hidden hover:bg-teal-100 transition-colors"
        style={{ top, height: Math.max(h, opts?.compact ? 18 : sh) }}>
        <p className="text-[10px] font-bold text-teal-800 leading-tight truncate">{job?.customer_name ?? '—'}</p>
        {ev.subject && <p className="text-[10px] text-teal-700 leading-tight truncate italic">{ev.subject}</p>}
        {!opts?.compact && <p className="text-[10px] text-teal-600 leading-tight">{fmtTime(ev.start_time)}–{fmtTime(ev.end_time)}</p>}
        {!opts?.compact && h >= sh * 2 && <p className="text-[10px] text-teal-500 mt-0.5">₪{cost.toFixed(0)}</p>}
      </button>
    )
  }

  function renderClassBlock(cl: SchoolClass, totalH: number, opts?: { compact?: boolean; slotH?: number }, topOffset = 0) {
    const sh = opts?.slotH ?? SLOT_H
    const top = timeToPixel(cl.start_time, sh) - topOffset + 2
    const h = durationToPixels(cl.start_time, cl.end_time, sh)
    if (top + h < 0 || top >= totalH) return null
    return (
      <button key={cl.id} onClick={() => { setSelectedClass(cl); setModal('classDetail') }}
        className="absolute left-0.5 right-0.5 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg p-1 text-left overflow-hidden hover:bg-purple-100 transition-colors"
        style={{ top, height: Math.max(h - 2, opts?.compact ? 18 : sh) }}>
        <p className="text-[10px] font-bold text-purple-800 leading-tight truncate">{cl.class_type_name}</p>
        {!opts?.compact && <p className="text-[10px] text-purple-600 leading-tight">{fmtTime(cl.start_time)}–{fmtTime(cl.end_time)}</p>}
        {!opts?.compact && h >= sh * 2 && <p className="text-[10px] text-purple-500 mt-0.5">{cl.duration_hours}h</p>}
      </button>
    )
  }

  function renderAsgBlock(a: Assignment, totalH: number, opts?: { compact?: boolean; slotH?: number }, topOffset = 0) {
    const sh = opts?.slotH ?? SLOT_H
    const top = timeToPixel(a.due_at, sh) - topOffset
    if (top < 0 || top >= totalH) return null
    return (
      <button key={a.id} onClick={() => { setSelectedAssignment(a); setModal('assignmentDetail') }}
        className="absolute left-0.5 right-0.5 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-1 text-left overflow-hidden hover:bg-amber-100 transition-colors"
        style={{ top, height: opts?.compact ? 18 : sh }}>
        <p className="text-[10px] font-bold text-amber-800 leading-tight truncate">📝 {a.subject}</p>
        {!opts?.compact && <p className="text-[10px] text-amber-600 leading-tight">due {fmtTime(a.due_at)}</p>}
      </button>
    )
  }

  function renderDayView() {
    const allDayItems = [...jobsOn(calDate), ...classesOn(calDate)]
    const shouldCollapse = dayCollapsed && allDayItems.length > 0

    let displayStart = DAY_START
    let displayEnd = DAY_END

    if (shouldCollapse) {
      const startHours = allDayItems.map(ev => new Date(ev.start_time).getHours())
      const endHours = allDayItems.map(ev => new Date(ev.end_time).getHours())
      displayStart = Math.max(DAY_START, Math.min(...startHours) - 1)
      displayEnd = Math.min(DAY_END, Math.max(...endHours) + 1)
    }

    const topOffset = (displayStart - DAY_START) * 2 * SLOT_H
    const visSlots = (displayEnd - displayStart) * 2
    const visH = visSlots * SLOT_H
    const collapsedTopHours = displayStart - DAY_START
    const collapsedBottomHours = DAY_END - displayEnd

    return (
      <div className="flex-1 overflow-y-auto">
        {collapsedTopHours > 0 && (
          <button onClick={() => setDayCollapsed(false)}
            className="w-full py-2 text-xs text-gray-400 text-center bg-gray-50 border-b border-dashed border-gray-200 hover:bg-gray-100">
            ▲ {collapsedTopHours}h hidden — tap to expand
          </button>
        )}
        <div className="relative flex" style={{ height: visH }}>
          <div className="w-12 flex-shrink-0">
            {TIMES.map((t, i) => {
              const pixAbs = i * SLOT_H
              if (pixAbs < topOffset || pixAbs >= topOffset + visH) return null
              return (
                <div key={t} className="absolute flex items-start"
                  style={{ top: pixAbs - topOffset, height: SLOT_H, left: 0, width: 48 }}>
                  {i % 2 === 0 && <span className="text-[10px] text-gray-400 pl-1 pt-0.5 leading-none">{t}</span>}
                </div>
              )
            })}
          </div>
          <div className="relative flex-1 border-l border-gray-200">
            {TIMES.map((_, i) => {
              const pixAbs = i * SLOT_H
              if (pixAbs < topOffset || pixAbs >= topOffset + visH) return null
              return (
                <div key={i} className={`absolute w-full border-t ${i % 2 === 0 ? 'border-gray-200' : 'border-gray-100'}`}
                  style={{ top: pixAbs - topOffset }} />
              )
            })}
            {jobsOn(calDate).map(ev => renderJobBlock(ev, visH, undefined, topOffset))}
            {classesOn(calDate).map(cl => renderClassBlock(cl, visH, undefined, topOffset))}
            {asgOn(calDate).map(a => renderAsgBlock(a, visH, undefined, topOffset))}
          </div>
        </div>
        {collapsedBottomHours > 0 && (
          <button onClick={() => setDayCollapsed(false)}
            className="w-full py-2 text-xs text-gray-400 text-center bg-gray-50 border-t border-dashed border-gray-200 hover:bg-gray-100">
            ▼ {collapsedBottomHours}h hidden — tap to expand
          </button>
        )}
      </div>
    )
  }

  function renderWeekView() {
    const totalH = TOTAL_SLOTS * WEEK_SLOT_H
    const days = weekDays(calDate)
    const todayKey = todayStr()
    return (
      <div className="flex-1 overflow-y-auto">
        {/* Day headers */}
        <div className="flex sticky top-0 bg-white z-[5] border-b border-gray-100">
          <div className="w-9 flex-shrink-0" />
          {days.map(d => {
            const isToday = dateStr(d) === todayKey
            return (
              <button key={d.toISOString()} onClick={() => { setCalDate(new Date(d)); setCalView('day') }}
                className="flex-1 py-1.5 text-center">
                <div className="text-[10px] text-gray-400 leading-none">{WEEKDAYS[d.getDay()]}</div>
                <div className={`text-xs font-bold mt-0.5 leading-none ${isToday ? 'text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center mx-auto' : 'text-gray-700'}`}>
                  {d.getDate()}
                </div>
              </button>
            )
          })}
        </div>
        <div className="relative flex" style={{ height: totalH }}>
          <div className="w-9 flex-shrink-0">
            {TIMES.map((t, i) => (
              <div key={t} className="absolute" style={{ top: i * WEEK_SLOT_H, left: 0 }}>
                {i % 2 === 0 && <span className="text-[9px] text-gray-400 pl-0.5 leading-none">{t.slice(0, 2)}</span>}
              </div>
            ))}
          </div>
          {days.map(d => (
            <div key={d.toISOString()} className="relative flex-1 border-l border-gray-200">
              {TIMES.map((_, i) => (
                <div key={i} className={`absolute w-full border-t ${i % 2 === 0 ? 'border-gray-100' : 'border-gray-50'}`}
                  style={{ top: i * WEEK_SLOT_H }} />
              ))}
              {jobsOn(d).map(ev => renderJobBlock(ev, totalH, { compact: true, slotH: WEEK_SLOT_H }))}
              {classesOn(d).map(cl => renderClassBlock(cl, totalH, { compact: true, slotH: WEEK_SLOT_H }))}
              {asgOn(d).map(a => renderAsgBlock(a, totalH, { compact: true, slotH: WEEK_SLOT_H }))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderMonthView() {
    const cells = monthGrid(calDate)
    const month = calDate.getMonth()
    const todayKey = todayStr()
    return (
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-7 gap-px mb-1">
          {WEEKDAYS.map(w => <div key={w} className="text-center text-[10px] font-semibold text-gray-400 py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {cells.map(d => {
            const inMonth = d.getMonth() === month
            const isToday = dateStr(d) === todayKey
            const dayJobEvs = jobsOn(d)
            const dayCls = classesOn(d)
            const dayAsgs = asgOn(d)
            const mini = [
              ...dayJobEvs.map(ev => ({
                id: ev.id,
                label: jobs.find(j => j.id === ev.job_id)?.customer_name ?? '—',
                bg: 'bg-teal-100', text: 'text-teal-800', time: ev.start_time,
              })),
              ...dayCls.map(cl => ({
                id: cl.id, label: cl.class_type_name,
                bg: 'bg-purple-100', text: 'text-purple-800', time: cl.start_time,
              })),
              ...dayAsgs.map(a => ({
                id: a.id, label: a.subject,
                bg: 'bg-amber-100', text: 'text-amber-800', time: a.due_at,
              })),
            ].sort((a, b) => a.time.localeCompare(b.time))
            const shown = mini.slice(0, 2)
            const extra = mini.length - shown.length
            return (
              <button key={d.toISOString()} onClick={() => { setCalDate(new Date(d)); setCalView('day') }}
                className={`min-h-[52px] rounded p-1 flex flex-col text-left ${inMonth ? 'bg-white' : 'bg-gray-50'} shadow-sm`}>
                <span className={`text-[11px] font-semibold leading-none self-center mb-0.5 ${isToday ? 'text-white bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center' : inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                  {d.getDate()}
                </span>
                <div className="w-full space-y-px">
                  {shown.map(ev => (
                    <div key={ev.id} className={`text-[8px] leading-tight truncate rounded px-0.5 ${ev.bg} ${ev.text}`}>
                      {ev.label}
                    </div>
                  ))}
                  {extra > 0 && (
                    <div className="text-[8px] text-gray-400 leading-none pl-0.5">+{extra}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        <div className="flex justify-center gap-4 mt-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> Jobs</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Classes</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Assignments</span>
        </div>
      </div>
    )
  }

  function renderCalendar() {
    const filterChips: { key: keyof typeof filters; label: string; color: string }[] = [
      { key: 'jobs', label: 'Jobs', color: 'teal' },
      { key: 'classes', label: 'Classes', color: 'purple' },
      { key: 'assignments', label: 'Assignments', color: 'amber' },
    ]
    return (
      <div className="flex flex-col h-full">
        {/* View toggle + filters */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="flex gap-1 px-3 pt-2">
            {(['day', 'week', 'month'] as const).map(v => (
              <button key={v} onClick={() => setCalView(v)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize ${calView === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {v}
              </button>
            ))}
          </div>
          {/* Nav */}
          <div className="flex items-center justify-between px-4 py-2">
            <button onClick={() => shiftCal(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-bold">‹</button>
            <button onClick={() => setCalDate((() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })())}
              className="font-semibold text-gray-800 text-sm">{calTitle()}</button>
            <button onClick={() => shiftCal(1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-bold">›</button>
          </div>
          {/* Filter chips */}
          <div className="flex gap-1.5 px-3 pb-2">
            {filterChips.map(c => {
              const on = filters[c.key]
              const colorOn = c.color === 'teal' ? 'bg-teal-100 text-teal-700 border-teal-300'
                : c.color === 'purple' ? 'bg-purple-100 text-purple-700 border-purple-300'
                : 'bg-amber-100 text-amber-700 border-amber-300'
              return (
                <button key={c.key} onClick={() => setFilters(f => ({ ...f, [c.key]: !f[c.key] }))}
                  className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold border ${on ? colorOn : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                  {on ? '✓ ' : ''}{c.label}
                </button>
              )
            })}
            {calView === 'day' && (
              <button onClick={() => setDayCollapsed(v => !v)}
                className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold border flex-shrink-0 ${dayCollapsed ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                {dayCollapsed ? '⊘ Compact' : '⊡ Full'}
              </button>
            )}
          </div>
        </div>

        {calView === 'day' && renderDayView()}
        {calView === 'week' && renderWeekView()}
        {calView === 'month' && renderMonthView()}

        {/* FABs */}
        <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-20">
          <button onClick={() => { resetClassForm(); setModal('newClass') }}
            className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2 rounded-full shadow-lg text-xs font-semibold">
            🎓 Class
          </button>
          <button onClick={() => { resetJobForm(); setModal('newJob') }}
            className="flex items-center gap-1.5 bg-teal-600 text-white px-3 py-2 rounded-full shadow-lg text-xs font-semibold">
            💼 Appt
          </button>
        </div>
      </div>
    )
  }

  // ── Jobs list ───────────────────────────────────────────────────────
  function renderJobs() {
    const grouped = jobs.reduce<Record<string, { job: Job; events: JobEvent[] }[]>>((acc, job) => {
      const ev = jobEvents.filter(e => e.job_id === job.id)
      const custName = job.customer_name
      if (!acc[custName]) acc[custName] = []
      acc[custName].push({ job, events: ev })
      return acc
    }, {})

    return (
      <div className="p-4 space-y-4">
        <button onClick={() => { resetJobForm(); setModal('newJob') }}
          className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm shadow">
          + New Appointment
        </button>
        {Object.entries(grouped).map(([custName, items]) => (
          <div key={custName} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-teal-50 px-4 py-2 border-b border-teal-100">
              <p className="font-bold text-teal-800 text-sm">{custName}</p>
            </div>
            {items.map(({ job, events: evs }) => {
              const total = evs.reduce((s, e) => s + calcCost(e.start_time, e.end_time, job.first_hour_rate, job.additional_hour_rate), 0)
              const totalHours = evs.reduce((s, e) => s + (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000, 0)
              return (
                <div key={job.id} className="p-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between">
                    <div>
                      {job.completed_at && (
                        <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mb-1">
                          ✓ Completed {fmtDate(job.completed_at)}
                        </span>
                      )}
                      {job.notes && <p className="text-xs text-gray-500 mb-1">{job.notes}</p>}
                      <p className="text-xs text-gray-400">
                        {evs.length} session{evs.length !== 1 ? 's' : ''} · {totalHours.toFixed(1)}h · ₪{total.toFixed(0)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Rates: ₪{job.first_hour_rate}/1st hr · ₪{job.additional_hour_rate}/add. hr
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openAddEvent(job.id)} className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-lg">+ Session</button>
                      <button onClick={() => handleDeleteJob(job.id)} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-lg">✕</button>
                    </div>
                  </div>
                  {evs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {evs.map(ev => (
                        <button key={ev.id} onClick={() => { setSelectedJobEvent(ev); setModal('eventDetail') }}
                          className="w-full text-left text-xs bg-teal-50 rounded-lg px-2 py-1.5 flex justify-between">
                          <span className="text-teal-700">{ev.subject ? `${ev.subject} · ` : ''}{fmtDate(ev.start_time)} · {fmtTime(ev.start_time)}–{fmtTime(ev.end_time)}</span>
                          <span className="text-teal-600 font-semibold">₪{calcCost(ev.start_time, ev.end_time, job.first_hour_rate, job.additional_hour_rate).toFixed(0)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!job.completed_at && (
                    <button onClick={() => openComplete(job.id)}
                      className="mt-2 w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold">
                      ✓ Mark complete & invoice
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
        {jobs.length === 0 && !loading && (
          <p className="text-center text-gray-400 text-sm py-8">No appointments yet. Tap "+ New Appointment" to get started.</p>
        )}
      </div>
    )
  }

  // ── Classes list ────────────────────────────────────────────────────
  function renderClasses() {
    // Group by class_type_id
    const groups: Record<string, { typeId: string; typeName: string; instances: SchoolClass[] }> = {}
    for (const cl of classes) {
      if (!groups[cl.class_type_id]) {
        groups[cl.class_type_id] = { typeId: cl.class_type_id, typeName: cl.class_type_name, instances: [] }
      }
      groups[cl.class_type_id].instances.push(cl)
    }
    const sortedGroups = Object.values(groups).sort((a, b) => a.typeName.localeCompare(b.typeName))
    for (const g of sortedGroups) {
      g.instances.sort((a, b) => a.start_time.localeCompare(b.start_time))
    }

    return (
      <div className="p-4 space-y-3">
        <button onClick={() => { resetClassForm(); setModal('newClass') }}
          className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold text-sm shadow">
          + New Class
        </button>

        {sortedGroups.map(group => {
          const isExpanded = expandedClassTypes.has(group.typeId)
          const toggle = () => setExpandedClassTypes(prev => {
            const next = new Set(prev)
            if (next.has(group.typeId)) next.delete(group.typeId)
            else next.add(group.typeId)
            return next
          })
          const upcoming = group.instances.filter(cl => new Date(cl.start_time) >= new Date())
          const totalAsg = group.instances.reduce((s, cl) => s + assignments.filter(a => a.class_id === cl.id).length, 0)

          return (
            <div key={group.typeId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Group header — tap to expand/collapse */}
              <button onClick={toggle} className="w-full text-left p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-lg flex-shrink-0">🎓</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{group.typeName}</p>
                  <p className="text-xs text-gray-500">
                    {group.instances.length} class{group.instances.length !== 1 ? 'es' : ''}
                    {upcoming.length > 0 && ` · ${upcoming.length} upcoming`}
                    {totalAsg > 0 && ` · ${totalAsg} assignment${totalAsg !== 1 ? 's' : ''}`}
                  </p>
                  {upcoming.length > 0 && (
                    <p className="text-xs text-purple-600 mt-0.5">
                      Next: {fmtDate(upcoming[0].start_time)} · {fmtTime(upcoming[0].start_time)}
                    </p>
                  )}
                </div>
                <span className="text-gray-400 text-sm ml-1">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {/* Expanded: individual class instances */}
              {isExpanded && (
                <div className="border-t border-purple-50">
                  {group.instances.map(cl => {
                    const clAsg = assignments.filter(a => a.class_id === cl.id)
                      .sort((a, b) => a.due_at.localeCompare(b.due_at))
                    return (
                      <div key={cl.id} className="border-b border-gray-50 last:border-0">
                        {/* Class row */}
                        <button onClick={() => { setSelectedClass(cl); setModal('classDetail') }}
                          className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-purple-50 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-700">{fmtDate(cl.start_time)}</p>
                            <p className="text-xs text-gray-400">{fmtTime(cl.start_time)}–{fmtTime(cl.end_time)} · {cl.duration_hours}h</p>
                            {cl.notes && <p className="text-xs text-gray-400 italic truncate">{cl.notes}</p>}
                          </div>
                          <span className="text-[10px] text-purple-500 ml-2 flex-shrink-0">
                            {clAsg.length > 0 ? `${clAsg.length} asg` : ''}
                          </span>
                        </button>

                        {/* Assignments under this class */}
                        {clAsg.length > 0 && (
                          <div className="px-4 pb-3 space-y-1.5">
                            {clAsg.map(a => (
                              <button key={a.id}
                                onClick={() => { setSelectedAssignment(a); setModal('assignmentDetail') }}
                                className="w-full text-left bg-amber-50 rounded-xl px-3 py-2 flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-amber-800 truncate">📝 {a.subject}</p>
                                  <p className="text-[11px] text-amber-600">due {fmtDate(a.due_at)} · {fmtTime(a.due_at)}</p>
                                </div>
                                {a.reminders_enabled && <span className="text-amber-400 text-xs flex-shrink-0 ml-1">🔔</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {classes.length === 0 && !loading && (
          <p className="text-center text-gray-400 text-sm py-8">No classes yet. Tap "+ New Class" to get started.</p>
        )}
      </div>
    )
  }

  // ── Customers list ──────────────────────────────────────────────────
  function renderCustomers() {
    const filtered = customers.filter(c => c.name.toLowerCase().includes(custFilter.toLowerCase()) || c.phone.includes(custFilter))
    return (
      <div className="p-4 space-y-3">
        <input value={custFilter} onChange={e => setCustFilter(e.target.value)}
          placeholder="Search customers…"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
        {filtered.map(c => {
          const custJobs = jobs.filter(j => j.customer_id === c.id)
          const custEvents = jobEvents.filter(e => custJobs.some(j => j.id === e.job_id))
          const total = custEvents.reduce((s, ev) => {
            const job = custJobs.find(j => j.id === ev.job_id)!
            return s + calcCost(ev.start_time, ev.end_time, job.first_hour_rate, job.additional_hour_rate)
          }, 0)
          return (
            <div key={c.id} className="relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <Link href={`/aviadmin/customers/${c.id}`} className="block p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{c.name}</p>
                    {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                    {c.address && <p className="text-xs text-gray-400 truncate">{c.address}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 pr-8">
                    <p className="text-sm font-bold text-teal-600">₪{total.toFixed(0)}</p>
                    <p className="text-xs text-gray-400">{custJobs.length} job{custJobs.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => handleDeleteCustomer(c.id)}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors text-lg leading-none"
                aria-label="Delete client"
              >
                ×
              </button>
            </div>
          )
        })}
        {filtered.length === 0 && !loading && (
          <p className="text-center text-gray-400 text-sm py-8">No customers found.</p>
        )}
      </div>
    )
  }

  // ── Modals ──────────────────────────────────────────────────────────
  const filteredExistingCust = customers.filter(c =>
    c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone.includes(custSearch)
  )

  function renderModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-end">
        <div className="absolute inset-0 bg-black/50" onClick={() => setModal(null)} />
        <div className="relative w-full bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-center pt-3 pb-1 relative">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
            <button onClick={() => setModal(null)}
              className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-sm font-bold hover:bg-gray-200">
              ✕
            </button>
          </div>

          {/* ── New Job ── */}
          {modal === 'newJob' && (
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">New Appointment</h2>

              {/* Customer */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Customer</label>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setCustMode('new')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold ${custMode === 'new' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    New customer
                  </button>
                  <button onClick={() => setCustMode('existing')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold ${custMode === 'existing' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    Existing
                  </button>
                </div>
                {custMode === 'new' ? (
                  <div className="space-y-2">
                    <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Full name *"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                    <input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="Phone number"
                      type="tel" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                    <input value={custAddress} onChange={e => setCustAddress(e.target.value)} placeholder="Address"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                  </div>
                ) : (
                  <div>
                    <input value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="Search customers…"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 mb-2" />
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {filteredExistingCust.map(c => (
                        <button key={c.id} onClick={() => { setCustId(c.id); setCustSearch(c.name) }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm ${custId === c.id ? 'bg-teal-100 text-teal-800 font-semibold' : 'bg-gray-50 text-gray-700'}`}>
                          {c.name} {c.phone && `· ${c.phone}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rates */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Rates (₪)</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-0.5 block">First hour</label>
                    <input type="number" value={jobFirstRate} onChange={e => setJobFirstRate(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-0.5 block">Additional /hr</label>
                    <input type="number" value={jobAddRate} onChange={e => setJobAddRate(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Notes</label>
                <input value={jobNotes} onChange={e => setJobNotes(e.target.value)} placeholder="Optional notes…"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>

              {/* Recurrence */}
              <RecurrenceControls value={jobRecur} onChange={setJobRecur} accent="teal" />

              {/* Sessions */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  {jobRecur.repeat ? 'Time (applied to every occurrence)' : 'Sessions'}
                </label>
                <div className="space-y-2">
                  {(jobRecur.repeat ? jobSlots.slice(0, 1) : jobSlots).map((slot, i) => {
                    const durationMins = slot.date && slot.start && slot.end
                      ? (new Date(`${slot.date}T${slot.end}`).getTime() - new Date(`${slot.date}T${slot.start}`).getTime()) / 60000
                      : 0
                    const cost = durationMins > 0 ? calcCost(`${slot.date}T${slot.start}`, `${slot.date}T${slot.end}`, jobFirstRate, jobAddRate) : 0
                    return (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">{jobRecur.repeat ? 'Starts on' : `Session ${i + 1}`}</span>
                          {!jobRecur.repeat && i > 0 && (
                            <button onClick={() => setJobSlots(s => s.filter((_, j) => j !== i))}
                              className="text-red-400 text-xs">Remove</button>
                          )}
                        </div>
                        <input value={slot.subject ?? ''} onChange={e => setJobSlots(s => s.map((sl, j) => j === i ? { ...sl, subject: e.target.value } : sl))}
                          placeholder="Subject (optional)"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                        <input type="date" value={slot.date} onChange={e => setJobSlots(s => s.map((sl, j) => j === i ? { ...sl, date: e.target.value } : sl))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-gray-400">Start</label>
                            <input type="time" step="1800" value={slot.start} onChange={e => setJobSlots(s => s.map((sl, j) => j === i ? { ...sl, start: e.target.value } : sl))}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-gray-400">End</label>
                            <input type="time" step="1800" value={slot.end} onChange={e => setJobSlots(s => s.map((sl, j) => j === i ? { ...sl, end: e.target.value } : sl))}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                          </div>
                        </div>
                        {cost > 0 && (
                          <p className="text-xs text-teal-600 font-semibold">
                            {(durationMins / 60).toFixed(1)}h → ₪{cost.toFixed(0)} per session
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
                {!jobRecur.repeat && (
                  <button onClick={() => setJobSlots(s => [...s, { date: todayStr(), start: '09:00', end: '10:00', subject: '' }])}
                    className="mt-2 w-full py-2 border-2 border-dashed border-teal-300 rounded-xl text-teal-600 text-sm font-semibold">
                    + Add another session
                  </button>
                )}
                {jobRecur.repeat && (() => {
                  const n = generateDates(jobRecur, jobSlots[0].date).length
                  return <p className="mt-2 text-xs text-teal-600 font-semibold">Creates {n} session{n !== 1 ? 's' : ''}</p>
                })()}
              </div>

              {/* Reminders */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-gray-700">🔔 Reminders</p>
                  <p className="text-[10px] text-gray-400">Push notification before each session</p>
                </div>
                <button onClick={() => setJobReminders(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${jobReminders ? 'bg-teal-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${jobReminders ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

              <ValidationErrors errors={[
                ...(custMode === 'new' && !custName.trim() ? ['Customer name is required.'] : []),
                ...(custMode === 'existing' && !custId ? ['Please select a customer from the list.'] : []),
                ...(jobSlots.some(s => s.start && s.end && s.start >= s.end) ? ['Session end time must be after start time.'] : []),
              ]} />
              <button onClick={handleSaveJob} disabled={saving || (custMode === 'new' ? !custName.trim() : !custId)}
                className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold text-sm shadow disabled:opacity-50">
                {saving ? 'Saving…' : 'Create Appointment'}
              </button>
            </div>
          )}

          {/* ── Add Event ── */}
          {modal === 'addEvent' && (
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">Add Session</h2>
              {(() => {
                const job = jobs.find(j => j.id === addEventJobId)
                return job && <p className="text-sm text-gray-500">To: <span className="font-semibold text-gray-700">{job.customer_name}</span></p>
              })()}
              <input value={evSubject} onChange={e => setEvSubject(e.target.value)} placeholder="Subject (optional)"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Start</label>
                  <input type="time" step="1800" value={evStart} onChange={e => setEvStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">End</label>
                  <input type="time" step="1800" value={evEnd} onChange={e => setEvEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                </div>
              </div>
              {evDate && evStart && evEnd && (() => {
                const job = jobs.find(j => j.id === addEventJobId)!
                const cost = calcCost(isoFromParts(evDate, evStart), isoFromParts(evDate, evEnd), job?.first_hour_rate ?? 250, job?.additional_hour_rate ?? 150)
                const mins = (new Date(isoFromParts(evDate, evEnd)).getTime() - new Date(isoFromParts(evDate, evStart)).getTime()) / 60000
                return <p className="text-sm text-teal-600 font-semibold">{(mins / 60).toFixed(1)}h → ₪{cost.toFixed(0)}</p>
              })()}
              <ValidationErrors errors={[
                ...(!evDate ? ['Please select a date.'] : []),
                ...(evDate && evStart && evEnd && evStart >= evEnd ? ['End time must be after start time.'] : []),
              ]} />
              <button onClick={handleAddEvent} disabled={saving}
                className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold text-sm shadow disabled:opacity-50">
                {saving ? 'Saving…' : 'Add Session'}
              </button>
            </div>
          )}

          {/* ── New Class ── */}
          {modal === 'newClass' && (
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">New Class</h2>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Class Type</label>
                {!clShowNewType ? (
                  <div className="space-y-2">
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {classTypes.map(ct => (
                        <button key={ct.id} onClick={() => setClTypeId(ct.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${clTypeId === ct.id ? 'bg-purple-100 text-purple-800 font-semibold' : 'bg-gray-50 text-gray-700'}`}>
                          {ct.name}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setClShowNewType(true)}
                      className="w-full py-2 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 text-sm font-semibold">
                      + Add new class type
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={clNewTypeName} onChange={e => setClNewTypeName(e.target.value)} placeholder="Class type name…" autoFocus
                      className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    <button onClick={() => setClShowNewType(false)} className="px-3 py-2 bg-gray-100 rounded-xl text-gray-500 text-sm">Cancel</button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Duration</label>
                <div className="flex gap-3">
                  {([1.5, 3] as const).map(d => (
                    <button key={d} onClick={() => setClDuration(d)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold ${clDuration === d ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {d}h
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Date & Start Time</label>
                <input type="date" value={clDate} onChange={e => setClDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                <input type="time" step="1800" value={clStart} onChange={e => setClStart(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                {clDate && clStart && (
                  <p className="text-xs text-purple-500 mt-1">
                    Ends at {addMinutes(clStart, clDate, clDuration * 60)}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Notes</label>
                <input value={clNotes} onChange={e => setClNotes(e.target.value)} placeholder="Optional…"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>

              {/* Recurrence */}
              <RecurrenceControls value={clRecur} onChange={setClRecur} accent="purple" />
              {clRecur.repeat && (() => {
                const n = generateDates(clRecur, clDate).length
                return <p className="text-xs text-purple-600 font-semibold">Creates {n} class{n !== 1 ? 'es' : ''}</p>
              })()}

              {/* Reminders */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-gray-700">🔔 Reminders</p>
                  <p className="text-[10px] text-gray-400">Push notification before each class</p>
                </div>
                <button onClick={() => setClReminders(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${clReminders ? 'bg-purple-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${clReminders ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

              <ValidationErrors errors={[
                ...(!clTypeId && !(clShowNewType && clNewTypeName.trim()) ? ['Please select a class type or enter a new one.'] : []),
                ...(!clDate ? ['Please select a date.'] : []),
              ]} />
              <button onClick={handleSaveClass} disabled={saving || (!clTypeId && !clNewTypeName.trim()) || !clDate}
                className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-bold text-sm shadow disabled:opacity-50">
                {saving ? 'Saving…' : 'Create Class'}
              </button>
            </div>
          )}

          {/* ── Event Detail ── */}
          {modal === 'eventDetail' && selectedJobEvent && (() => {
            const ev = selectedJobEvent
            const job = jobs.find(j => j.id === ev.job_id)
            const cost = calcCost(ev.start_time, ev.end_time, job?.first_hour_rate ?? 250, job?.additional_hour_rate ?? 150)
            const hours = (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 3600000
            return (
              <div className="p-5 space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Appointment</h2>
                <div className="bg-teal-50 rounded-2xl p-4 space-y-1.5">
                  <p className="font-bold text-teal-800 text-base">{job?.customer_name}</p>
                  {ev.subject && <p className="text-sm font-semibold text-teal-700">📋 {ev.subject}</p>}
                  {job?.customer_phone && <p className="text-sm text-teal-700">📞 {job.customer_phone}</p>}
                  {job?.customer_address && <p className="text-sm text-teal-600">📍 {job.customer_address}</p>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">Date</p>
                    <p className="text-sm font-semibold text-gray-700">{fmtDate(ev.start_time)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">Time</p>
                    <p className="text-sm font-semibold text-gray-700">{fmtTime(ev.start_time)}–{fmtTime(ev.end_time)}</p>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-teal-400">Cost</p>
                    <p className="text-sm font-bold text-teal-700">₪{cost.toFixed(0)}</p>
                    <p className="text-[10px] text-teal-400">{hours.toFixed(1)}h</p>
                  </div>
                </div>
                {job?.notes && <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">{job.notes}</p>}
                <Link href={`/aviadmin/customers/${job?.customer_id}`} onClick={() => setModal(null)}
                  className="block w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold text-center">
                  View customer profile →
                </Link>
                <button onClick={() => openEditEvent(ev)}
                  className="w-full py-2.5 bg-teal-50 text-teal-700 rounded-xl text-sm font-semibold">
                  ✏️ Edit session
                </button>
                <button onClick={() => handleDeleteJobEvent(ev.id)}
                  className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">
                  Delete session
                </button>
              </div>
            )
          })()}

          {/* ── Class Detail ── */}
          {modal === 'classDetail' && selectedClass && (() => {
            const classAsg = assignments.filter(a => a.class_id === selectedClass.id)
              .sort((a, b) => a.due_at.localeCompare(b.due_at))
            return (
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">Class</h2>
              <div className="bg-purple-50 rounded-2xl p-4 space-y-1.5">
                <p className="font-bold text-purple-800 text-base">{selectedClass.class_type_name}</p>
                <p className="text-sm text-purple-700">{fmtDate(selectedClass.start_time)} · {fmtTime(selectedClass.start_time)}–{fmtTime(selectedClass.end_time)}</p>
                <p className="text-sm text-purple-600">{selectedClass.duration_hours} hours</p>
              </div>
              {selectedClass.notes && <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">{selectedClass.notes}</p>}

              {/* Assignments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assignments</label>
                  <button onClick={() => openNewAssignment(selectedClass.id)}
                    className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg font-semibold">+ Add</button>
                </div>
                {classAsg.length === 0 ? (
                  <p className="text-xs text-gray-400">No assignments yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {classAsg.map(a => (
                      <button key={a.id} onClick={() => { setSelectedAssignment(a); setModal('assignmentDetail') }}
                        className="w-full text-left bg-amber-50 rounded-xl px-3 py-2 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-amber-800 truncate">📝 {a.subject}</p>
                          <p className="text-[11px] text-amber-600">due {fmtDate(a.due_at)} · {fmtTime(a.due_at)}</p>
                        </div>
                        {a.reminders_enabled && <span className="text-amber-400 text-xs flex-shrink-0">🔔</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => openEditClass(selectedClass)}
                className="w-full py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold">
                ✏️ Edit class
              </button>
              <button onClick={() => handleDeleteClass(selectedClass.id)}
                className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">
                Delete class
              </button>
            </div>
            )
          })()}

          {/* ── New Assignment ── */}
          {modal === 'newAssignment' && (() => {
            const cl = classes.find(c => c.id === asgClassId)
            return (
              <div className="p-5 space-y-4">
                <h2 className="text-lg font-bold text-gray-800">New Assignment</h2>
                {cl && <p className="text-sm text-gray-500">For <span className="font-semibold text-purple-700">{cl.class_type_name}</span></p>}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Subject</label>
                  <input value={asgSubject} onChange={e => setAsgSubject(e.target.value)} placeholder="e.g. Chapter 4 worksheet" autoFocus
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Notes</label>
                  <textarea value={asgNotes} onChange={e => setAsgNotes(e.target.value)} placeholder="Details…" rows={2}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Due date & time</label>
                  <div className="flex gap-2">
                    <input type="date" value={asgDate} onChange={e => setAsgDate(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    <input type="time" step="1800" value={asgTime} onChange={e => setAsgTime(e.target.value)}
                      className="w-28 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">🔔 Reminders</p>
                    <p className="text-[10px] text-gray-400">Push notification before it is due</p>
                  </div>
                  <button onClick={() => setAsgReminders(v => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${asgReminders ? 'bg-amber-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${asgReminders ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <ValidationErrors errors={[
                  ...(!asgSubject.trim() ? ['Please enter a subject for this assignment.'] : []),
                  ...(!asgDate ? ['Please select a due date.'] : []),
                ]} />
                <button onClick={handleSaveAssignment} disabled={saving || !asgSubject.trim() || !asgDate}
                  className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-bold text-sm shadow disabled:opacity-50">
                  {saving ? 'Saving…' : 'Add Assignment'}
                </button>
              </div>
            )
          })()}

          {/* ── Assignment Detail ── */}
          {modal === 'assignmentDetail' && selectedAssignment && (
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">Assignment</h2>
              <div className="bg-amber-50 rounded-2xl p-4 space-y-1.5">
                <p className="font-bold text-amber-800 text-base">📝 {selectedAssignment.subject}</p>
                {selectedAssignment.class_type_name && <p className="text-sm text-amber-700">{selectedAssignment.class_type_name}</p>}
                <p className="text-sm text-amber-600">Due {fmtDate(selectedAssignment.due_at)} · {fmtTime(selectedAssignment.due_at)}</p>
                {selectedAssignment.reminders_enabled && <p className="text-xs text-amber-500">🔔 Reminder on</p>}
              </div>
              {selectedAssignment.notes && <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap">{selectedAssignment.notes}</p>}
              <button onClick={() => handleDeleteAssignment(selectedAssignment.id)}
                className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">
                Delete assignment
              </button>
            </div>
          )}

          {/* ── Complete Job ── */}
          {modal === 'completeJob' && (() => {
            const job = jobs.find(j => j.id === completeJobId)
            const totalMins = compHours * 60 + compMins
            const amount = costFromMinutes(totalMins, job?.first_hour_rate ?? 250, job?.additional_hour_rate ?? 150)
            return (
              <div className="p-5 space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Complete Job</h2>
                {job && <p className="text-sm text-gray-500">For <span className="font-semibold text-gray-700">{job.customer_name}</span></p>}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Actual time worked</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400 mb-0.5 block">Hours</label>
                      <input type="number" min={0} value={compHours} onChange={e => setCompHours(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400 mb-0.5 block">Minutes</label>
                      <input type="number" min={0} max={59} step={5} value={compMins} onChange={e => setCompMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Pre-filled from scheduled sessions — adjust to actual hours worked.</p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-emerald-600">Invoice will be created for</p>
                      <p className="text-[10px] text-emerald-400">
                        {compHours}h {compMins > 0 ? `${compMins}m` : ''} · ₪{job?.first_hour_rate}/1st hr · ₪{job?.additional_hour_rate}/add. hr
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">₪{amount.toFixed(0)}</p>
                  </div>
                </div>
                <ValidationErrors errors={[
                  ...(totalMins <= 0 ? ['Please enter the time worked — it must be at least 1 minute.'] : []),
                ]} />
                <button onClick={handleCompleteJob} disabled={saving || totalMins <= 0}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow disabled:opacity-50">
                  {saving ? 'Saving…' : `Confirm ${compHours}h ${compMins > 0 ? `${compMins}m` : ''} & create invoice`}
                </button>
              </div>
            )
          })()}

          {/* ── Edit Event ── */}
          {modal === 'editEvent' && (() => {
            const ev = jobEvents.find(e => e.id === editEventId)
            const job = ev ? jobs.find(j => j.id === ev.job_id) : null
            return (
              <div className="p-5 space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Edit Session</h2>
                {job && <p className="text-sm text-gray-500">For <span className="font-semibold text-gray-700">{job.customer_name}</span></p>}
                <input value={editEventSubject} onChange={e => setEditEventSubject(e.target.value)} placeholder="Subject (optional)"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                <input type="date" value={editEventDate} onChange={e => setEditEventDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Start</label>
                    <input type="time" step="1800" value={editEventStart} onChange={e => setEditEventStart(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">End</label>
                    <input type="time" step="1800" value={editEventEnd} onChange={e => setEditEventEnd(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                  </div>
                </div>
                {editEventDate && editEventStart && editEventEnd && (() => {
                  const mins = (new Date(isoFromParts(editEventDate, editEventEnd)).getTime() - new Date(isoFromParts(editEventDate, editEventStart)).getTime()) / 60000
                  if (mins <= 0) return null
                  const cost = calcCost(isoFromParts(editEventDate, editEventStart), isoFromParts(editEventDate, editEventEnd), job?.first_hour_rate ?? 250, job?.additional_hour_rate ?? 150)
                  return <p className="text-sm text-teal-600 font-semibold">{(mins / 60).toFixed(1)}h → ₪{cost.toFixed(0)}</p>
                })()}
                <ValidationErrors errors={[
                  ...(!editEventDate ? ['Please select a date.'] : []),
                  ...(editEventDate && editEventStart && editEventEnd && editEventStart >= editEventEnd ? ['End time must be after start time.'] : []),
                ]} />
                <button onClick={handleUpdateEvent} disabled={saving}
                  className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold text-sm shadow disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )
          })()}

          {/* ── Edit Class ── */}
          {modal === 'editClass' && (
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">Edit Class</h2>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Class Type</label>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {classTypes.map(ct => (
                    <button key={ct.id} onClick={() => setEditClassTypeId(ct.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${editClassTypeId === ct.id ? 'bg-purple-100 text-purple-800 font-semibold' : 'bg-gray-50 text-gray-700'}`}>
                      {ct.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Duration</label>
                <div className="flex gap-3">
                  {([1.5, 3] as const).map(d => (
                    <button key={d} onClick={() => setEditClassDuration(d)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold ${editClassDuration === d ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {d}h
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Date & Start Time</label>
                <input type="date" value={editClassDate} onChange={e => setEditClassDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                <input type="time" step="1800" value={editClassStart} onChange={e => setEditClassStart(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                {editClassDate && editClassStart && (
                  <p className="text-xs text-purple-500 mt-1">Ends at {addMinutes(editClassStart, editClassDate, editClassDuration * 60)}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Notes</label>
                <input value={editClassNotes} onChange={e => setEditClassNotes(e.target.value)} placeholder="Optional…"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <ValidationErrors errors={[
                ...(!editClassTypeId ? ['Please select a class type.'] : []),
                ...(!editClassDate ? ['Please select a date.'] : []),
              ]} />
              <button onClick={handleUpdateClass} disabled={saving || !editClassTypeId || !editClassDate}
                className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-bold text-sm shadow disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── App shell ────────────────────────────────────────────────────────
  const TAB_CFG: { key: Tab; label: string; emoji: string }[] = [
    { key: 'calendar', label: 'Calendar', emoji: '📅' },
    { key: 'map', label: 'Map', emoji: '🗺️' },
    { key: 'jobs', label: 'Jobs', emoji: '💼' },
    { key: 'classes', label: 'Classes', emoji: '🎓' },
    { key: 'customers', label: 'Clients', emoji: '👥' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3 sticky top-0 z-10 flex items-center gap-3" style={{ height: 60 }}>
        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-base">🗓</div>
        <div>
          <h1 className="text-base font-bold leading-tight">Avi Calendar</h1>
          <p className="text-[10px] text-blue-200 leading-none">Appointment & Class Manager</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {loading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          <span className="text-[9px] text-white/60 font-mono">{pushDebugInfo()}</span>
          {pushState !== 'unsupported' && (
            <button onClick={handleTogglePush} disabled={pushBusy}
              title={pushState === 'enabled' ? 'Reminders on' : 'Enable reminders'}
              className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${pushState === 'enabled' ? 'bg-white/25 text-white' : 'bg-white/10 text-blue-100'}`}>
              {pushBusy ? '…' : pushState === 'enabled' ? '🔔 On' : pushState === 'denied' ? '🔕 Blocked' : '🔔 Off'}
            </button>
          )}
        </div>
      </div>

      {/* Page content */}
      <div className={tab === 'map' ? '' : 'pb-20'}>
        {tab === 'calendar' && renderCalendar()}
        {tab === 'jobs' && renderJobs()}
        {tab === 'classes' && renderClasses()}
        {tab === 'customers' && renderCustomers()}
        {tab === 'map' && <MapTab jobs={jobs} jobEvents={jobEvents} />}
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-10 safe-area-inset-bottom">
        {TAB_CFG.map(({ key, label, emoji }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors ${tab === key ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className="text-xl leading-none">{emoji}</span>
            <span className={`text-[10px] font-semibold leading-none ${tab === key ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
            {tab === key && <div className="w-1 h-1 rounded-full bg-blue-600 mt-0.5" />}
          </button>
        ))}
      </div>

      {/* Modals */}
      {modal && renderModal()}

      {/* Alert modal */}
      {alertMsg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAlertMsg(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <p className="text-sm text-gray-700 mb-5 leading-relaxed">{alertMsg}</p>
            <button onClick={() => setAlertMsg(null)}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm">
              OK
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDialog(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <p className="text-sm text-gray-700 mb-5 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm">
                Cancel
              </button>
              <button onClick={() => { const fn = confirmDialog.onConfirm; setConfirmDialog(null); fn() }}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
