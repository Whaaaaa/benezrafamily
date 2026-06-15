'use client'

import '../../../aviadmin/aviadmin.css'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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

const PAYMENT_METHODS = [
  { id: 'bit',           label: 'Bit',           icon: '📱' },
  { id: 'bank_transfer', label: 'Bank Transfer',  icon: '🏦' },
  { id: 'cash',          label: 'Cash',           icon: '💵' },
]

function paymentLabel(id?: string | null) {
  return PAYMENT_METHODS.find(m => m.id === id)?.label ?? id ?? ''
}

function calcCost(startTime: string, endTime: string, firstRate: number, addRate: number): number {
  const mins = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
  const hours = mins / 60
  if (hours <= 0) return 0
  if (hours <= 1) return Number(firstRate)
  return Number(firstRate) + (hours - 1) * Number(addRate)
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IL', { hour: '2-digit', minute: '2-digit', hour12: false })
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

/* ── Inline SVG icons ─────────────────────────────────────────────── */
function IconWrench() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
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
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)

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

  async function handleMarkPaid(invoice: Invoice, method: string) {
    setSaving(true)
    try {
      await fetch(`/api/aviadmin/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid_at: new Date().toISOString(), payment_method: method }),
      })
      await fetchData()
      setPayingInvoice(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkUnpaid(invoice: Invoice) {
    setSaving(true)
    try {
      await fetch(`/api/aviadmin/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid_at: null, payment_method: null }),
      })
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="aviadmin-root min-h-screen flex items-center justify-center">
        <div className="av-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="aviadmin-root min-h-screen flex flex-col items-center justify-center gap-4">
        <p style={{ color: 'var(--av-text-2)' }}>Customer not found.</p>
        <Link href="/aviadmin" style={{ color: 'var(--av-cyan)', fontWeight: 700 }}>← Back</Link>
      </div>
    )
  }

  const allEvents = data.jobs.flatMap(j => j.events.map(e => ({ ...e, job: j })))
  const totalCost = data.jobs.reduce((sum, job) =>
    sum + job.events.reduce((s, e) => s + calcCost(e.start_time, e.end_time, job.first_hour_rate, job.additional_hour_rate), 0), 0)
  const totalHours = allEvents.reduce((s, e) =>
    s + (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000, 0)
  const totalSessions = allEvents.length

  const invoices = data.invoices ?? []
  const invoicedTotal = invoices.reduce((s, inv) => s + Number(inv.amount), 0)
  const paidTotal = invoices.filter(i => i.paid_at).reduce((s, inv) => s + Number(inv.amount), 0)
  const outstandingTotal = invoicedTotal - paidTotal

  const S = {
    surface: { background: 'linear-gradient(145deg, #1a2130, #141920)', border: '1px solid #2a3447' },
    card: { background: 'linear-gradient(145deg, #1a2130 0%, #141920 100%)', border: '1px solid #2a3447', borderRadius: 16, padding: '12px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.5)' },
  }

  return (
    <div className="aviadmin-root min-h-screen pb-20">

      {/* ── Header ── */}
      <header className="av-header">
        <Link
          href="/aviadmin"
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(42,52,71,0.6)', border: '1px solid #2a3447', borderRadius: 10,
            color: 'var(--av-text-2)', fontSize: 18, fontWeight: 700, flexShrink: 0, textDecoration: 'none',
          }}
        >
          ‹
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="av-header-title" style={{ fontSize: 14 }}>CLIENT PROFILE</p>
          <p className="av-header-sub">{data.name}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          style={{
            padding: '5px 12px', background: 'rgba(56,189,248,0.1)',
            border: '1px solid rgba(56,189,248,0.25)', borderRadius: 8,
            color: 'var(--av-cyan)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
          }}
        >
          EDIT
        </button>
      </header>

      {/* ── Hero card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f1a2d 0%, #0a0d12 100%)',
        borderBottom: '1px solid #2a3447',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #1e3a5f, #1a2d4a)',
            border: '1px solid rgba(56,189,248,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: 'var(--av-cyan)',
            boxShadow: '0 0 20px rgba(56,189,248,0.15)',
            flexShrink: 0,
          }}>
            {data.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--av-text)', letterSpacing: '-0.02em' }}>{data.name}</p>
            {data.phone && (
              <a href={`tel:${data.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--av-text-2)', fontSize: 12, marginTop: 2, textDecoration: 'none' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.07 6.07l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {data.phone}
              </a>
            )}
            {data.address && (
              <p style={{ display: 'flex', alignItems: 'flex-start', gap: 5, color: 'var(--av-text-dim)', fontSize: 11, marginTop: 2 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                {data.address}
              </p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href={`/aviadmin/clients/${id}`}
            target="_blank"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(42,52,71,0.6)', border: '1px solid #2a3447',
              color: 'var(--av-text-2)', fontSize: 11, fontWeight: 700,
              padding: '7px 12px', borderRadius: 8, textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
            CLIENT VIEW
          </Link>
          {data.phone && (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                const url = `${window.location.origin}/aviadmin/clients/${id}`
                const phone = data.phone.replace(/\D/g, '').replace(/^0/, '972')
                const msg = encodeURIComponent(`Hello! Check your upcoming appointments and payments here: ${url}`)
                window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
                color: '#4ade80', fontSize: 11, fontWeight: 700,
                padding: '7px 12px', borderRadius: 8, textDecoration: 'none',
                letterSpacing: '0.04em',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WHATSAPP
            </a>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'REVENUE', value: `₪${totalCost.toFixed(0)}`, color: 'var(--av-teal)' },
            { label: 'SESSIONS', value: String(totalSessions), color: 'var(--av-cyan)' },
            { label: 'HOURS', value: totalHours.toFixed(1), color: 'var(--av-purple)' },
          ].map(s => (
            <div key={s.label} style={{ ...S.card, textAlign: 'center', padding: '12px 8px' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
              <p style={{ fontSize: 9, color: 'var(--av-text-dim)', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Jobs */}
        {data.jobs.length === 0 ? (
          <div style={{ ...S.card, textAlign: 'center', padding: 24 }}>
            <p style={{ color: 'var(--av-text-dim)', fontSize: 13 }}>No jobs yet for this client.</p>
          </div>
        ) : (
          data.jobs.map((job, jobIdx) => {
            const jobCost = job.events.reduce((s, e) => s + calcCost(e.start_time, e.end_time, job.first_hour_rate, job.additional_hour_rate), 0)
            const jobHours = job.events.reduce((s, e) => s + (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000, 0)
            return (
              <div key={job.id} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #2a3447', boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                {/* Job header */}
                <div style={{
                  background: 'linear-gradient(90deg, rgba(13,148,136,0.2) 0%, rgba(13,148,136,0.05) 100%)',
                  borderBottom: '1px solid rgba(45,212,191,0.15)',
                  padding: '12px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--av-teal)' }}><IconWrench /></span>
                      <p style={{ fontWeight: 800, color: 'var(--av-teal)', fontSize: 13, letterSpacing: '0.02em' }}>
                        JOB #{jobIdx + 1}
                      </p>
                      {job.completed_at && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, color: 'var(--av-green)',
                          background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
                          padding: '2px 6px', borderRadius: 100, letterSpacing: '0.06em',
                        }}>
                          ✓ DONE
                        </span>
                      )}
                    </div>
                    {job.notes && <p style={{ fontSize: 11, color: 'var(--av-text-2)', marginTop: 2 }}>{job.notes}</p>}
                    <p style={{ fontSize: 10, color: 'var(--av-text-dim)', marginTop: 3 }}>
                      ₪{job.first_hour_rate}/1st hr · ₪{job.additional_hour_rate}/add. hr
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 800, color: 'var(--av-teal)', fontSize: 16 }}>₪{jobCost.toFixed(0)}</p>
                    <p style={{ fontSize: 10, color: 'var(--av-text-dim)' }}>{jobHours.toFixed(1)}h</p>
                  </div>
                </div>

                {/* Sessions */}
                {job.events.length === 0 ? (
                  <div style={{ background: 'var(--av-surface)', padding: '12px 16px' }}>
                    <p style={{ fontSize: 12, color: 'var(--av-text-dim)' }}>No sessions scheduled.</p>
                  </div>
                ) : (
                  <div style={{ background: 'var(--av-surface)' }}>
                    {job.events.map((ev, i) => {
                      const cost = calcCost(ev.start_time, ev.end_time, job.first_hour_rate, job.additional_hour_rate)
                      const hours = (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 3600000
                      return (
                        <div key={ev.id} style={{
                          padding: '10px 16px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          borderTop: i > 0 ? '1px solid rgba(42,52,71,0.5)' : undefined,
                        }}>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--av-text)' }}>{fmtDateLong(ev.start_time)}</p>
                            {ev.subject && (
                              <p style={{ fontSize: 11, color: 'var(--av-teal)', fontWeight: 600, marginTop: 1 }}>
                                {ev.subject}
                              </p>
                            )}
                            <p style={{ fontSize: 10, color: 'var(--av-text-dim)', marginTop: 1 }}>
                              {fmtTime(ev.start_time)} – {fmtTime(ev.end_time)} · {hours.toFixed(1)}h
                            </p>
                          </div>
                          <p style={{ fontWeight: 700, color: 'var(--av-teal)', fontSize: 13 }}>₪{cost.toFixed(0)}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--av-text-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Invoices</p>
              {outstandingTotal > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--av-amber)' }}>
                  ₪{outstandingTotal.toFixed(0)} outstanding
                </span>
              )}
            </div>
            {invoices.map(inv => (
              <div key={inv.id} style={{ ...S.card }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--av-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.description || 'Work completed'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--av-text-dim)', marginTop: 2 }}>
                      {fmtDateShort(inv.created_at)} · {fmtMinutes(Number(inv.total_minutes))}
                    </p>
                    {inv.paid_at ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                        fontSize: 10, fontWeight: 800, color: 'var(--av-green)',
                        background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
                        padding: '3px 8px', borderRadius: 100, letterSpacing: '0.04em',
                      }}>
                        ✓ PAID · {paymentLabel(inv.payment_method)}
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-block', marginTop: 6,
                        fontSize: 10, fontWeight: 800, color: 'var(--av-amber)',
                        background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)',
                        padding: '3px 8px', borderRadius: 100, letterSpacing: '0.04em',
                      }}>
                        UNPAID
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--av-text)', letterSpacing: '-0.03em' }}>
                      ₪{Number(inv.amount).toFixed(0)}
                    </p>
                    {inv.paid_at ? (
                      <button
                        onClick={() => handleMarkUnpaid(inv)}
                        disabled={saving}
                        style={{ fontSize: 10, color: 'var(--av-text-dim)', marginTop: 4, textDecoration: 'underline' }}
                      >
                        Undo
                      </button>
                    ) : (
                      <button
                        onClick={() => setPayingInvoice(inv)}
                        style={{
                          marginTop: 6, fontSize: 11, fontWeight: 700,
                          background: 'linear-gradient(135deg, #059669, #047857)',
                          color: 'white', padding: '5px 10px', borderRadius: 8,
                          boxShadow: '0 2px 8px rgba(5,150,105,0.35)', letterSpacing: '0.04em',
                        }}
                      >
                        MARK PAID
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Paid / Outstanding mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ ...S.card, textAlign: 'center', padding: '12px 8px' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--av-green)', letterSpacing: '-0.03em' }}>₪{paidTotal.toFixed(0)}</p>
                <p style={{ fontSize: 9, color: 'var(--av-text-dim)', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2 }}>PAID</p>
              </div>
              <div style={{ ...S.card, textAlign: 'center', padding: '12px 8px' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--av-amber)', letterSpacing: '-0.03em' }}>₪{outstandingTotal.toFixed(0)}</p>
                <p style={{ fontSize: 9, color: 'var(--av-text-dim)', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2 }}>OUTSTANDING</p>
              </div>
            </div>
          </div>
        )}

        {/* Total bar */}
        {data.jobs.length > 0 && (
          <div style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #0d2d40 0%, #091d2e 100%)',
            border: '1px solid rgba(56,189,248,0.2)',
            padding: '16px',
            boxShadow: '0 0 24px rgba(56,189,248,0.08), 0 4px 16px rgba(0,0,0,0.5)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--av-text-2)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {invoices.length > 0 ? 'Invoiced Total' : 'Estimated Total'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--av-text-dim)', marginTop: 3 }}>
                {data.jobs.length} job{data.jobs.length !== 1 ? 's' : ''} · {totalSessions} session{totalSessions !== 1 ? 's' : ''} · {totalHours.toFixed(1)}h
              </p>
            </div>
            <p style={{ fontSize: 32, fontWeight: 900, color: 'var(--av-cyan)', letterSpacing: '-0.04em' }}>
              ₪{(invoices.length > 0 ? invoicedTotal : totalCost).toFixed(0)}
            </p>
          </div>
        )}
      </div>

      {/* ── Pay modal ── */}
      {payingInvoice && (
        <div className="av-backdrop">
          <div className="absolute inset-0" onClick={() => setPayingInvoice(null)} />
          <div className="av-sheet">
            <div className="av-drag-handle" />
            <button onClick={() => setPayingInvoice(null)} className="av-close-btn">✕</button>
            <div style={{ padding: '12px 20px 28px' }}>
              <p className="av-modal-title">Mark as Paid</p>
              <p style={{ fontSize: 13, color: 'var(--av-text-2)', marginBottom: 16 }}>
                {payingInvoice.description || 'Work completed'} ·{' '}
                <span style={{ fontWeight: 700, color: 'var(--av-text)' }}>₪{Number(payingInvoice.amount).toFixed(0)}</span>
              </p>
              <p style={{ fontSize: 10, color: 'var(--av-text-dim)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Payment method
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleMarkPaid(payingInvoice, m.id)}
                    disabled={saving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)',
                      borderRadius: 12, textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{m.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--av-text)' }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editing && (
        <div className="av-backdrop">
          <div className="absolute inset-0" onClick={() => setEditing(false)} />
          <div className="av-sheet">
            <div className="av-drag-handle" />
            <button onClick={() => setEditing(false)} className="av-close-btn">✕</button>
            <div style={{ padding: '12px 20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p className="av-modal-title">Edit Client</p>
              {[
                { val: editName, set: setEditName, placeholder: 'Full name', type: 'text' },
                { val: editPhone, set: setEditPhone, placeholder: 'Phone number', type: 'tel' },
                { val: editAddress, set: setEditAddress, placeholder: 'Address', type: 'text' },
              ].map(({ val, set, placeholder, type }) => (
                <input
                  key={placeholder}
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  type={type}
                  style={{
                    width: '100%', padding: '11px 14px',
                    background: 'var(--av-bg)', border: '1px solid var(--av-border)',
                    borderRadius: 12, color: 'var(--av-text)', fontSize: 14,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              ))}
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editName.trim()}
                style={{
                  padding: '13px 0', marginTop: 4,
                  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                  color: 'white', borderRadius: 12, fontWeight: 800, fontSize: 13,
                  letterSpacing: '0.04em', boxShadow: '0 2px 12px rgba(37,99,235,0.4)',
                  opacity: (saving || !editName.trim()) ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving…' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom nav ── */}
      <nav className="av-tabbar">
        {[
          { key: 'calendar', label: 'Schedule', icon: (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          )},
          { key: 'map', label: 'Map', icon: (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
            </svg>
          )},
          { key: 'jobs', label: 'Jobs', icon: (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          )},
          { key: 'classes', label: 'Classes', icon: (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          )},
          { key: 'customers', label: 'Clients', icon: (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          )},
        ].map(({ key, label, icon }) => (
          <Link
            key={key}
            href={`/aviadmin?tab=${key}`}
            className={`av-tab-btn ${key === 'customers' ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <span className="av-tab-icon">{icon}</span>
            <span className="av-tab-label">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
