'use client'

import { useState, useEffect, useCallback } from 'react'
import { use } from 'react'

type JobEvent = { id: string; job_id: string; start_time: string; end_time: string; subject?: string }
type Job = {
  id: string; customer_id: string; notes: string
  first_hour_rate: number; additional_hour_rate: number; created_at: string; completed_at?: string | null
  events: JobEvent[]
}
type Invoice = {
  id: string; job_id: string; customer_id: string; amount: number; total_minutes: number
  description: string; created_at: string; paid_at?: string | null; payment_method?: string | null
}
type CustomerDetail = {
  id: string; name: string; phone: string; address: string; created_at: string
  jobs: Job[]; invoices: Invoice[]
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

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-IL', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtMinutes(mins: number) {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return m ? `${h}h ${m}m` : `${h}h`
}

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/aviadmin/customers/${id}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-2 p-8">
        <p className="text-4xl">🔨</p>
        <p className="text-gray-700 font-semibold">Avi Handyman Services</p>
        <p className="text-gray-400 text-sm">Profile not found.</p>
      </div>
    )
  }

  const allEvents = data.jobs.flatMap(j => j.events.map(e => ({ ...e, job: j })))
  const totalHours = allEvents.reduce((s, e) =>
    s + (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000, 0)
  const totalSessions = allEvents.length

  const invoices = data.invoices ?? []
  const invoicedTotal = invoices.reduce((s, inv) => s + Number(inv.amount), 0)
  const paidTotal = invoices.filter(i => i.paid_at).reduce((s, inv) => s + Number(inv.amount), 0)
  const outstandingTotal = invoicedTotal - paidTotal

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-700 text-white px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">🔨</div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Avi Handyman Services</h1>
            <p className="text-sm text-teal-200 leading-none">Your service summary</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
            {data.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-bold">{data.name}</p>
            {data.phone && <p className="text-sm text-teal-200">📞 {data.phone}</p>}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-teal-600">₪{invoicedTotal.toFixed(0)}</p>
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

        {/* Invoices */}
        {invoices.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-gray-700">Invoices</h2>
              {outstandingTotal > 0 && (
                <span className="text-xs font-semibold text-amber-600">₪{outstandingTotal.toFixed(0)} outstanding</span>
              )}
            </div>
            {invoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{inv.description || 'Work completed'}</p>
                    <p className="text-xs text-gray-400">
                      {fmtDateShort(inv.created_at)} · {fmtMinutes(Number(inv.total_minutes))}
                    </p>
                    {inv.paid_at ? (
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ✓ Paid
                      </span>
                    ) : (
                      <span className="inline-block mt-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Unpaid
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-gray-800 flex-shrink-0">₪{Number(inv.amount).toFixed(0)}</p>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-lg font-bold text-emerald-600">₪{paidTotal.toFixed(0)}</p>
                <p className="text-xs text-gray-400">Paid</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-lg font-bold text-amber-600">₪{outstandingTotal.toFixed(0)}</p>
                <p className="text-xs text-gray-400">Outstanding</p>
              </div>
            </div>
          </div>
        )}

        {/* Work history */}
        {data.jobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700 px-1">Work History</h2>
            {data.jobs.map((job, idx) => {
              const jobHours = job.events.reduce((s, e) =>
                s + (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000, 0)
              return (
                <div key={job.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-teal-50 px-4 py-3 border-b border-teal-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-teal-800 text-sm">
                        Job #{idx + 1}
                        {job.completed_at && (
                          <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full align-middle">✓ Done</span>
                        )}
                      </p>
                      {job.notes && <p className="text-xs text-teal-600">{job.notes}</p>}
                    </div>
                    <p className="text-xs text-teal-500">{jobHours.toFixed(1)}h</p>
                  </div>
                  {job.events.length > 0 && (
                    <div className="divide-y divide-gray-50">
                      {job.events.map(ev => {
                        const hours = (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 3600000
                        return (
                          <div key={ev.id} className="px-4 py-3 flex justify-between items-center">
                            <div>
                              <p className="text-sm font-semibold text-gray-700">{fmtDateLong(ev.start_time)}</p>
                              {ev.subject && <p className="text-xs font-semibold text-teal-700">📋 {ev.subject}</p>}
                              <p className="text-xs text-gray-400">{fmtTime(ev.start_time)} – {fmtTime(ev.end_time)} · {hours.toFixed(1)}h</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">🔨 Avi Handyman Services</p>
        </div>
      </div>
    </div>
  )
}
