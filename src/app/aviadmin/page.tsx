'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import MapTab from './MapTab'

type Customer = { id: string; name: string; phone: string; address: string; created_at: string }
type ClassType = { id: string; name: string }
type Job = {
  id: string; customer_id: string; customer_name: string; customer_phone: string; customer_address: string
  notes: string; first_hour_rate: number; additional_hour_rate: number; created_at: string
}
type JobEvent = { id: string; job_id: string; start_time: string; end_time: string }
type SchoolClass = {
  id: string; class_type_id: string; class_type_name: string
  duration_hours: number; start_time: string; end_time: string; notes: string
}
type Tab = 'calendar' | 'jobs' | 'classes' | 'customers' | 'map'
type Modal = 'newJob' | 'addEvent' | 'newClass' | 'eventDetail' | 'classDetail' | null

const DAY_START = 7
const DAY_END = 21
const SLOT_H = 48

function uid() { return crypto.randomUUID() }

function calcCost(startTime: string, endTime: string, firstRate: number, addRate: number): number {
  const mins = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
  const hours = mins / 60
  if (hours <= 0) return 0
  if (hours <= 1) return Number(firstRate)
  return Number(firstRate) + (hours - 1) * Number(addRate)
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

function timeToPixel(isoOrHHMM: string) {
  const t = isoOrHHMM.length > 5 ? isoOrHHMM : `2000-01-01T${isoOrHHMM}:00`
  const d = new Date(t)
  const h = d.getHours()
  const m = d.getMinutes()
  return ((h - DAY_START) * 60 + m) / 30 * SLOT_H
}

function durationToPixels(startIso: string, endIso: string) {
  const mins = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
  return (mins / 30) * SLOT_H
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TIMES: string[] = []
for (let h = DAY_START; h < DAY_END; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`)
  TIMES.push(`${String(h).padStart(2, '0')}:30`)
}
const TOTAL_SLOTS = (DAY_END - DAY_START) * 2

export default function AviadminPage() {
  const [tab, setTab] = useState<Tab>('calendar')
  const [calDate, setCalDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })

  const [customers, setCustomers] = useState<Customer[]>([])
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobEvents, setJobEvents] = useState<JobEvent[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [modal, setModal] = useState<Modal>(null)
  const [selectedJobEvent, setSelectedJobEvent] = useState<JobEvent | null>(null)
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null)
  const [addEventJobId, setAddEventJobId] = useState('')

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
  const [jobSlots, setJobSlots] = useState([{ date: todayStr(), start: '09:00', end: '10:00' }])

  // ── Add Event form ──
  const [evDate, setEvDate] = useState(todayStr())
  const [evStart, setEvStart] = useState('09:00')
  const [evEnd, setEvEnd] = useState('10:00')

  // ── New Class form ──
  const [clTypeId, setClTypeId] = useState('')
  const [clNewTypeName, setClNewTypeName] = useState('')
  const [clShowNewType, setClShowNewType] = useState(false)
  const [clDuration, setClDuration] = useState<1.5 | 3>(1.5)
  const [clDate, setClDate] = useState(todayStr())
  const [clStart, setClStart] = useState('09:00')
  const [clNotes, setClNotes] = useState('')

  // ── Customer filter ──
  const [custFilter, setCustFilter] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [c, ct, j, je, cl] = await Promise.all([
        fetch('/api/aviadmin/customers').then(r => r.json()),
        fetch('/api/aviadmin/class-types').then(r => r.json()),
        fetch('/api/aviadmin/jobs').then(r => r.json()),
        fetch('/api/aviadmin/job-events').then(r => r.json()),
        fetch('/api/aviadmin/classes').then(r => r.json()),
      ])
      setCustomers(Array.isArray(c) ? c : [])
      setClassTypes(Array.isArray(ct) ? ct : [])
      setJobs(Array.isArray(j) ? j : [])
      setJobEvents(Array.isArray(je) ? je : [])
      setClasses(Array.isArray(cl) ? cl : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function resetJobForm() {
    setCustMode('new'); setCustSearch(''); setCustId(''); setCustName(''); setCustPhone(''); setCustAddress('')
    setJobFirstRate(250); setJobAddRate(150); setJobNotes('')
    setJobSlots([{ date: todayStr(), start: '09:00', end: '10:00' }])
  }

  function resetClassForm() {
    setClTypeId(''); setClNewTypeName(''); setClShowNewType(false)
    setClDuration(1.5); setClDate(todayStr()); setClStart('09:00'); setClNotes('')
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
      for (const slot of jobSlots) {
        if (!slot.date || !slot.start || !slot.end) continue
        await fetch('/api/aviadmin/job-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: uid(), job_id: jobId, start_time: isoFromParts(slot.date, slot.start), end_time: isoFromParts(slot.date, slot.end) }),
        })
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
        body: JSON.stringify({ id: uid(), job_id: addEventJobId, start_time: isoFromParts(evDate, evStart), end_time: isoFromParts(evDate, evEnd) }),
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
      const endTime = addMinutes(clStart, clDate, clDuration * 60)
      await fetch('/api/aviadmin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uid(), class_type_id: typeId, duration_hours: clDuration, start_time: isoFromParts(clDate, clStart), end_time: isoFromParts(clDate, endTime), notes: clNotes }),
      })
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

  async function handleDeleteJob(id: string) {
    if (!confirm('Delete this job and all its sessions?')) return
    await fetch(`/api/aviadmin/jobs/${id}`, { method: 'DELETE' })
    await fetchAll()
  }

  function openAddEvent(jobId: string) {
    setAddEventJobId(jobId)
    setEvDate(todayStr())
    setEvStart('09:00')
    setEvEnd('10:00')
    setModal('addEvent')
  }

  // ── Calendar Day View ───────────────────────────────────────────────
  const dayJobEvents = jobEvents.filter(e => isSameDay(calDate, e.start_time))
  const dayClasses = classes.filter(c => isSameDay(calDate, c.start_time))

  function renderCalendar() {
    const totalH = TOTAL_SLOTS * SLOT_H
    return (
      <div className="flex flex-col h-full">
        {/* Day nav */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-[60px] z-10">
          <button onClick={() => { const d = new Date(calDate); d.setDate(d.getDate() - 1); setCalDate(d) }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-bold">‹</button>
          <div className="text-center">
            <div className="font-semibold text-gray-800 text-sm">{fmtDayFull(calDate)}</div>
            <div className="text-xs text-gray-400">{dayJobEvents.length} appt · {dayClasses.length} class</div>
          </div>
          <button onClick={() => { const d = new Date(calDate); d.setDate(d.getDate() + 1); setCalDate(d) }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-bold">›</button>
        </div>

        {/* Time grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="relative flex" style={{ height: totalH }}>
            {/* Time labels */}
            <div className="w-12 flex-shrink-0">
              {TIMES.map((t, i) => (
                <div key={t} className="absolute flex items-start" style={{ top: i * SLOT_H, height: SLOT_H, left: 0, width: 48 }}>
                  {i % 2 === 0 && (
                    <span className="text-[10px] text-gray-400 pl-1 pt-0.5 leading-none">{t}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid lines + events */}
            <div className="relative flex-1 border-l border-gray-200">
              {TIMES.map((_, i) => (
                <div key={i} className={`absolute w-full border-t ${i % 2 === 0 ? 'border-gray-200' : 'border-gray-100'}`}
                  style={{ top: i * SLOT_H }} />
              ))}

              {/* Job events */}
              {dayJobEvents.map(ev => {
                const job = jobs.find(j => j.id === ev.job_id)
                const top = timeToPixel(ev.start_time)
                const h = durationToPixels(ev.start_time, ev.end_time)
                const cost = calcCost(ev.start_time, ev.end_time, job?.first_hour_rate ?? 250, job?.additional_hour_rate ?? 150)
                if (top < 0 || top >= totalH) return null
                return (
                  <button key={ev.id} onClick={() => { setSelectedJobEvent(ev); setModal('eventDetail') }}
                    className="absolute left-1 right-1 bg-teal-50 border-l-4 border-teal-500 rounded-r-lg p-1.5 text-left overflow-hidden hover:bg-teal-100 transition-colors"
                    style={{ top, height: Math.max(h, SLOT_H) }}>
                    <p className="text-[11px] font-bold text-teal-800 leading-tight truncate">{job?.customer_name ?? '—'}</p>
                    <p className="text-[10px] text-teal-600 leading-tight">{fmtTime(ev.start_time)}–{fmtTime(ev.end_time)}</p>
                    {h >= SLOT_H * 2 && <p className="text-[10px] text-teal-500 mt-0.5">₪{cost.toFixed(0)}</p>}
                  </button>
                )
              })}

              {/* School classes */}
              {dayClasses.map(cl => {
                const top = timeToPixel(cl.start_time)
                const h = durationToPixels(cl.start_time, cl.end_time)
                if (top < 0 || top >= totalH) return null
                return (
                  <button key={cl.id} onClick={() => { setSelectedClass(cl); setModal('classDetail') }}
                    className="absolute left-1 right-1 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg p-1.5 text-left overflow-hidden hover:bg-purple-100 transition-colors"
                    style={{ top: top + 4, height: Math.max(h - 4, SLOT_H) }}>
                    <p className="text-[11px] font-bold text-purple-800 leading-tight truncate">{cl.class_type_name}</p>
                    <p className="text-[10px] text-purple-600 leading-tight">{fmtTime(cl.start_time)}–{fmtTime(cl.end_time)}</p>
                    {h >= SLOT_H * 2 && <p className="text-[10px] text-purple-500 mt-0.5">{cl.duration_hours}h</p>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

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
                          <span className="text-teal-700">{fmtDate(ev.start_time)} · {fmtTime(ev.start_time)}–{fmtTime(ev.end_time)}</span>
                          <span className="text-teal-600 font-semibold">₪{calcCost(ev.start_time, ev.end_time, job.first_hour_rate, job.additional_hour_rate).toFixed(0)}</span>
                        </button>
                      ))}
                    </div>
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
    const upcoming = [...classes].sort((a, b) => a.start_time.localeCompare(b.start_time))
    return (
      <div className="p-4 space-y-3">
        <button onClick={() => { resetClassForm(); setModal('newClass') }}
          className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold text-sm shadow">
          + New Class
        </button>
        {upcoming.map(cl => (
          <button key={cl.id} onClick={() => { setSelectedClass(cl); setModal('classDetail') }}
            className="w-full text-left bg-white rounded-2xl shadow-sm p-3 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-lg flex-shrink-0">🎓</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm">{cl.class_type_name}</p>
              <p className="text-xs text-gray-500">{fmtDate(cl.start_time)} · {fmtTime(cl.start_time)}–{fmtTime(cl.end_time)}</p>
              <p className="text-xs text-purple-600">{cl.duration_hours}h</p>
            </div>
          </button>
        ))}
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
            <Link key={c.id} href={`/aviadmin/customers/${c.id}`}
              className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{c.name}</p>
                  {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                  {c.address && <p className="text-xs text-gray-400 truncate">{c.address}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-teal-600">₪{total.toFixed(0)}</p>
                  <p className="text-xs text-gray-400">{custJobs.length} job{custJobs.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </Link>
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
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

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

              {/* Sessions */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Sessions</label>
                <div className="space-y-2">
                  {jobSlots.map((slot, i) => {
                    const durationMins = slot.date && slot.start && slot.end
                      ? (new Date(`${slot.date}T${slot.end}`).getTime() - new Date(`${slot.date}T${slot.start}`).getTime()) / 60000
                      : 0
                    const cost = durationMins > 0 ? calcCost(`${slot.date}T${slot.start}`, `${slot.date}T${slot.end}`, jobFirstRate, jobAddRate) : 0
                    return (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">Session {i + 1}</span>
                          {i > 0 && (
                            <button onClick={() => setJobSlots(s => s.filter((_, j) => j !== i))}
                              className="text-red-400 text-xs">Remove</button>
                          )}
                        </div>
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
                            {(durationMins / 60).toFixed(1)}h → ₪{cost.toFixed(0)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button onClick={() => setJobSlots(s => [...s, { date: todayStr(), start: '09:00', end: '10:00' }])}
                  className="mt-2 w-full py-2 border-2 border-dashed border-teal-300 rounded-xl text-teal-600 text-sm font-semibold">
                  + Add another session
                </button>
              </div>

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
                <button onClick={() => handleDeleteJobEvent(ev.id)}
                  className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">
                  Delete session
                </button>
              </div>
            )
          })()}

          {/* ── Class Detail ── */}
          {modal === 'classDetail' && selectedClass && (
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">Class</h2>
              <div className="bg-purple-50 rounded-2xl p-4 space-y-1.5">
                <p className="font-bold text-purple-800 text-base">{selectedClass.class_type_name}</p>
                <p className="text-sm text-purple-700">{fmtDate(selectedClass.start_time)} · {fmtTime(selectedClass.start_time)}–{fmtTime(selectedClass.end_time)}</p>
                <p className="text-sm text-purple-600">{selectedClass.duration_hours} hours</p>
              </div>
              {selectedClass.notes && <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">{selectedClass.notes}</p>}
              <button onClick={() => handleDeleteClass(selectedClass.id)}
                className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">
                Delete class
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
        {loading && <div className="ml-auto w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
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
    </div>
  )
}
