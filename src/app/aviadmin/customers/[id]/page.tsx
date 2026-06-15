'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { use } from 'react'

type JobEvent = { id: string; job_id: string; start_time: string; end_time: string }
type Job = {
  id: string; customer_id: string; notes: string
  first_hour_rate: number; additional_hour_rate: number; created_at: string
  events: JobEvent[]
}
type CustomerDetail = {
  id: string; name: string; phone: string; address: string; created_at: string
  jobs: Job[]
}

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

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-IL', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/aviadmin/customers/${id}`)
      if (res.ok) {
        const d = await res.json()
        setData(d)
        setEditName(d.name)
        setEditPhone(d.phone)
        setEditAddress(d.address)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSaveEdit() {
    setSaving(true)
    try {
      await fetch(`/api/aviadmin/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, phone: editPhone, address: editAddress }),
      })
      await fetchData()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Customer not found.</p>
        <Link href="/aviadmin" className="text-blue-600 font-semibold">← Back to Calendar</Link>
      </div>
    )
  }

  const allEvents = data.jobs.flatMap(j => j.events.map(e => ({ ...e, job: j })))
  const totalCost = data.jobs.reduce((sum, job) =>
    sum + job.events.reduce((s, e) => s + calcCost(e.start_time, e.end_time, job.first_hour_rate, job.additional_hour_rate), 0), 0)
  const totalHours = allEvents.reduce((s, e) =>
    s + (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000, 0)
  const totalSessions = allEvents.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 pt-4 pb-6 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/aviadmin" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white font-bold">‹</Link>
          <span className="text-sm font-semibold text-blue-100">Client Profile</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
            {data.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{data.name}</h1>
            {data.phone && <p className="text-sm text-blue-200">📞 {data.phone}</p>}
            {data.address && <p className="text-sm text-blue-200">📍 {data.address}</p>}
          </div>
          <button onClick={() => setEditing(true)} className="ml-auto text-white/80 text-sm bg-white/10 px-3 py-1.5 rounded-xl">Edit</button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-teal-600">₪{totalCost.toFixed(0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{totalSessions}</p>
            <p className="text-xs text-gray-400 mt-0.5">Sessions</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-indigo-600">{totalHours.toFixed(1)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Hours</p>
          </div>
        </div>

        {/* Jobs */}
        {data.jobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <p className="text-gray-400 text-sm">No jobs yet for this customer.</p>
          </div>
        ) : (
          data.jobs.map((job, jobIdx) => {
            const jobCost = job.events.reduce((s, e) => s + calcCost(e.start_time, e.end_time, job.first_hour_rate, job.additional_hour_rate), 0)
            const jobHours = job.events.reduce((s, e) => s + (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000, 0)
            return (
              <div key={job.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-teal-50 px-4 py-3 border-b border-teal-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-teal-800 text-sm">Job #{jobIdx + 1}</p>
                    {job.notes && <p className="text-xs text-teal-600">{job.notes}</p>}
                    <p className="text-xs text-teal-500 mt-0.5">
                      Rates: ₪{job.first_hour_rate}/1st hr · ₪{job.additional_hour_rate}/add. hr
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-teal-700">₪{jobCost.toFixed(0)}</p>
                    <p className="text-xs text-teal-500">{jobHours.toFixed(1)}h</p>
                  </div>
                </div>

                {job.events.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">No sessions scheduled.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {job.events.map(ev => {
                      const cost = calcCost(ev.start_time, ev.end_time, job.first_hour_rate, job.additional_hour_rate)
                      const hours = (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 3600000
                      return (
                        <div key={ev.id} className="px-4 py-3 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-semibold text-gray-700">{fmtDateLong(ev.start_time)}</p>
                            <p className="text-xs text-gray-400">{fmtTime(ev.start_time)} – {fmtTime(ev.end_time)} · {hours.toFixed(1)}h</p>
                          </div>
                          <p className="font-semibold text-teal-600 text-sm">₪{cost.toFixed(0)}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Running total */}
        {data.jobs.length > 0 && (
          <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-4 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-teal-100">Grand Total</p>
                <p className="text-xs text-teal-200">{data.jobs.length} job{data.jobs.length !== 1 ? 's' : ''} · {totalSessions} session{totalSessions !== 1 ? 's' : ''} · {totalHours.toFixed(1)}h</p>
              </div>
              <p className="text-3xl font-bold">₪{totalCost.toFixed(0)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditing(false)} />
          <div className="relative w-full bg-white rounded-t-3xl p-5 space-y-4 shadow-2xl">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-1" />
            <h2 className="text-lg font-bold text-gray-800">Edit Customer</h2>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone number" type="tel"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Address"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <button onClick={handleSaveEdit} disabled={saving || !editName.trim()}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
