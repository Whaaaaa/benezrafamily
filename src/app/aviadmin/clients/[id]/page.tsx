'use client'

import '../../aviadmin.css'
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
  return new Date(iso).toLocaleTimeString('en-IL', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-IL', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-IL', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtMinutes(mins: number) {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return m ? `${h}h ${m}m` : `${h}h`
}

/* ── Design tokens (inlined so this page is self-contained) ─────────── */
const C = {
  bg:         '#0a0d12',
  surface:    '#141920',
  surface2:   '#1a2130',
  surface3:   '#1f2937',
  border:     '#2a3447',
  borderHi:   '#3d5178',
  text:       '#dde4f0',
  text2:      '#8fa3c0',
  textDim:    '#536478',
  cyan:       '#38bdf8',
  teal:       '#2dd4bf',
  amber:      '#fbbf24',
  green:      '#34d399',
  red:        '#f87171',
}

/* ── SVG icons ─────────────────────────────────────────────────────── */
function IconGear({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconWrench({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function IconCheck({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconClock({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconPhone({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.07 6.07l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

/* ── Shared styles ─────────────────────────────────────────────────── */
const card = {
  background: `linear-gradient(145deg, ${C.surface} 0%, ${C.surface2} 100%)`,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
} as const

const label = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: C.textDim,
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

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: `3px solid rgba(56,189,248,0.15)`,
          borderTopColor: C.cyan,
          animation: 'spin 0.75s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ── Not found ── */
  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <div style={{ color: C.teal }}><IconGear size={40} /></div>
        <p style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>Avi Pro Services</p>
        <p style={{ fontSize: 13, color: C.textDim }}>Profile not found.</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const allEvents = data.jobs.flatMap(j => j.events.map(e => ({ ...e, job: j })))
  const totalHours  = allEvents.reduce((s, e) => s + (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000, 0)
  const totalSessions = allEvents.length

  const invoices        = data.invoices ?? []
  const invoicedTotal   = invoices.reduce((s, inv) => s + Number(inv.amount), 0)
  const paidTotal       = invoices.filter(i => i.paid_at).reduce((s, inv) => s + Number(inv.amount), 0)
  const outstandingTotal = invoicedTotal - paidTotal
  const hasOutstanding  = outstandingTotal > 0.5

  return (
    <div style={{ minHeight: '100vh', background: C.bg, backgroundImage: `linear-gradient(rgba(42,52,71,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(42,52,71,0.2) 1px,transparent 1px)`, backgroundSize: '48px 48px', color: C.text, fontFamily: 'inherit' }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .cp-card { animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .cp-card:nth-child(1) { animation-delay: 0.05s; }
        .cp-card:nth-child(2) { animation-delay: 0.10s; }
        .cp-card:nth-child(3) { animation-delay: 0.15s; }
        .cp-card:nth-child(4) { animation-delay: 0.20s; }
        .cp-card:nth-child(5) { animation-delay: 0.25s; }
        .cp-card:nth-child(6) { animation-delay: 0.30s; }
        .inv-unpaid { border-left: 3px solid ${C.amber} !important; }
        .inv-paid   { border-left: 3px solid ${C.green} !important; }
      `}</style>

      {/* ══ HERO HEADER ══════════════════════════════════════════════════ */}
      <header style={{
        background: `linear-gradient(180deg, #111a28 0%, ${C.surface} 100%)`,
        borderBottom: `1px solid ${C.border}`,
        boxShadow: `0 4px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(56,189,248,0.12)`,
        position: 'relative',
        overflow: 'hidden',
        paddingBottom: 24,
      }}>
        {/* Subtle radial glow behind logo */}
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 300, height: 200,
          background: 'radial-gradient(ellipse, rgba(56,189,248,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* ── Company brand bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' }}>
          <div style={{
            width: 42, height: 42, flexShrink: 0,
            background: `linear-gradient(135deg, #1e40af, #2563eb)`,
            border: `1px solid rgba(56,189,248,0.25)`,
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(56,189,248,0.2)',
            color: 'white',
          }}>
            <IconGear size={22} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
              AVI PRO SERVICES
            </p>
            <p style={{ ...label, marginTop: 3, color: C.textDim }}>Professional · Reliable · Quality</p>
          </div>
        </div>

        {/* ── Divider line ── */}
        <div style={{ height: 1, margin: '16px 20px', background: `linear-gradient(90deg, transparent, ${C.borderHi}, transparent)`, opacity: 0.5 }} />

        {/* ── Client info ── */}
        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 54, height: 54, flexShrink: 0, borderRadius: 16,
            background: `linear-gradient(135deg, #0f2a45, #0a1d30)`,
            border: `1px solid rgba(56,189,248,0.2)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 900, color: C.cyan,
            boxShadow: '0 0 24px rgba(56,189,248,0.1)',
          }}>
            {data.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...label, marginBottom: 4 }}>Client Statement</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: '-0.025em', lineHeight: 1.1 }}>{data.name}</p>
            {data.phone && (
              <a href={`tel:${data.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, color: C.text2, fontSize: 12, textDecoration: 'none' }}>
                <IconPhone size={11} /> {data.phone}
              </a>
            )}
          </div>
        </div>

        {/* ── Stat strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '16px 20px 0' }}>
          {[
            { label: 'Invoiced', value: `₪${invoicedTotal > 0 ? invoicedTotal.toFixed(0) : '—'}`, color: C.teal },
            { label: 'Sessions', value: String(totalSessions),         color: C.cyan },
            { label: 'Hours',    value: totalHours > 0 ? totalHours.toFixed(1) : '—', color: C.text2 },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(42,52,71,0.4)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</p>
              <p style={{ ...label, marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* ══ BODY ═════════════════════════════════════════════════════════ */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600, margin: '0 auto' }}>

        {/* ── Outstanding balance alert ── */}
        {hasOutstanding && (
          <div className="cp-card" style={{
            background: `linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(180,83,9,0.06) 100%)`,
            border: `1px solid rgba(251,191,36,0.3)`,
            borderRadius: 14,
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            boxShadow: `0 0 20px rgba(251,191,36,0.06)`,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, boxShadow: `0 0 6px ${C.amber}` }} />
                <p style={{ ...label, color: C.amber, fontSize: 10 }}>Outstanding Balance</p>
              </div>
              <p style={{ fontSize: 11, color: C.text2 }}>Please arrange payment at your earliest convenience</p>
            </div>
            <p style={{ fontSize: 26, fontWeight: 900, color: C.amber, letterSpacing: '-0.04em', flexShrink: 0 }}>
              ₪{outstandingTotal.toFixed(0)}
            </p>
          </div>
        )}

        {/* ── Invoices ── */}
        {invoices.length > 0 && (
          <section className="cp-card">
            {/* Section header */}
            <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 16, background: `linear-gradient(180deg, ${C.cyan}, transparent)`, borderRadius: 2 }} />
                <p style={{ ...label, fontSize: 10, color: C.text2 }}>Invoices</p>
              </div>
              <p style={{ ...label, fontSize: 10, color: C.textDim }}>{invoices.length} total</p>
            </div>

            {/* Invoice rows */}
            {invoices.map((inv, i) => {
              const paid = !!inv.paid_at
              return (
                <div
                  key={inv.id}
                  className={paid ? 'inv-paid' : 'inv-unpaid'}
                  style={{
                    padding: '14px 16px',
                    borderTop: i > 0 ? `1px solid rgba(42,52,71,0.5)` : undefined,
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.description || 'Work completed'}
                    </p>
                    <p style={{ fontSize: 11, color: C.textDim, marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <IconClock size={10} />
                      {fmtDateShort(inv.created_at)} · {fmtMinutes(Number(inv.total_minutes))}
                    </p>
                    <div style={{ marginTop: 7 }}>
                      {paid ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                          color: C.green,
                          background: 'rgba(52,211,153,0.1)',
                          border: '1px solid rgba(52,211,153,0.25)',
                          padding: '3px 8px', borderRadius: 100,
                        }}>
                          <IconCheck size={10} /> PAID
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                          color: C.amber,
                          background: 'rgba(251,191,36,0.1)',
                          border: '1px solid rgba(251,191,36,0.25)',
                          padding: '3px 8px', borderRadius: 100,
                        }}>
                          ● UNPAID
                        </span>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: paid ? C.text2 : C.text, letterSpacing: '-0.04em', flexShrink: 0, marginTop: 2 }}>
                    ₪{Number(inv.amount).toFixed(0)}
                  </p>
                </div>
              )
            })}

            {/* Paid / Outstanding summary */}
            {invoices.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${C.border}` }}>
                <div style={{ padding: '12px 16px', borderRight: `1px solid ${C.border}`, textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color: C.green, letterSpacing: '-0.03em' }}>₪{paidTotal.toFixed(0)}</p>
                  <p style={{ ...label, marginTop: 3 }}>Paid</p>
                </div>
                <div style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color: hasOutstanding ? C.amber : C.textDim, letterSpacing: '-0.03em' }}>₪{outstandingTotal.toFixed(0)}</p>
                  <p style={{ ...label, marginTop: 3 }}>Outstanding</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Work History ── */}
        {data.jobs.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 2px' }}>
              <div style={{ width: 3, height: 14, background: `linear-gradient(180deg, ${C.teal}, transparent)`, borderRadius: 2 }} />
              <p style={{ ...label, fontSize: 10, color: C.text2 }}>Work History</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.jobs.map((job, idx) => {
                const jobHours = job.events.reduce((s, e) =>
                  s + (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000, 0)
                const jobCost = job.events.reduce((s, e) =>
                  s + calcCost(e.start_time, e.end_time, job.first_hour_rate, job.additional_hour_rate), 0)

                return (
                  <div key={job.id} className="cp-card" style={{ ...card, overflow: 'hidden' }}>
                    {/* Job header */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '12px 16px',
                      background: 'linear-gradient(90deg, rgba(13,148,136,0.15) 0%, rgba(13,148,136,0.03) 100%)',
                      borderBottom: `1px solid rgba(45,212,191,0.12)`,
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: C.teal, lineHeight: 0 }}><IconWrench size={13} /></span>
                          <p style={{ fontSize: 12, fontWeight: 800, color: C.teal, letterSpacing: '0.04em' }}>
                            JOB #{idx + 1}
                          </p>
                          {job.completed_at && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                              color: C.green, background: 'rgba(52,211,153,0.1)',
                              border: '1px solid rgba(52,211,153,0.2)',
                              padding: '2px 6px', borderRadius: 100,
                            }}>
                              <IconCheck size={8} /> DONE
                            </span>
                          )}
                        </div>
                        {job.notes && (
                          <p style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{job.notes}</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {jobCost > 0 && (
                          <p style={{ fontSize: 15, fontWeight: 800, color: C.teal, letterSpacing: '-0.02em' }}>₪{jobCost.toFixed(0)}</p>
                        )}
                        <p style={{ fontSize: 10, color: C.textDim }}>{jobHours.toFixed(1)}h</p>
                      </div>
                    </div>

                    {/* Sessions */}
                    {job.events.length === 0 ? (
                      <div style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: 12, color: C.textDim }}>No sessions on record.</p>
                      </div>
                    ) : (
                      job.events.map((ev, evIdx) => {
                        const hours = (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 3600000
                        const isLast = evIdx === job.events.length - 1
                        return (
                          <div key={ev.id} style={{
                            padding: '11px 16px 11px 20px',
                            borderTop: `1px solid rgba(42,52,71,0.5)`,
                            display: 'flex', alignItems: 'center', gap: 12,
                            position: 'relative',
                          }}>
                            {/* Timeline dot + line */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, alignSelf: 'stretch', marginLeft: -12, marginRight: 4 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.teal, boxShadow: `0 0 6px ${C.teal}`, marginTop: 6, flexShrink: 0 }} />
                              {!isLast && (
                                <div style={{ flex: 1, width: 1, background: `linear-gradient(180deg, rgba(45,212,191,0.4), transparent)`, marginTop: 4 }} />
                              )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{fmtDateLong(ev.start_time)}</p>
                              {ev.subject && (
                                <p style={{ fontSize: 11, color: C.teal, fontWeight: 600, marginTop: 1 }}>{ev.subject}</p>
                              )}
                              <p style={{ fontSize: 10, color: C.textDim, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <IconClock size={9} />
                                {fmtTime(ev.start_time)} – {fmtTime(ev.end_time)} · {hours.toFixed(1)}h
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {data.jobs.length === 0 && invoices.length === 0 && (
          <div className="cp-card" style={{ ...card, padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ color: C.textDim, marginBottom: 10 }}><IconWrench size={28} /></div>
            <p style={{ fontSize: 13, color: C.textDim }}>No service history yet.</p>
          </div>
        )}

        {/* ── Footer ── */}
        <footer style={{ paddingTop: 8, paddingBottom: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ height: 1, width: '40%', background: `linear-gradient(90deg, transparent, ${C.borderHi}, transparent)`, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.textDim }}>
            <IconGear size={14} />
            <p style={{ fontSize: 12, fontWeight: 800, color: C.textDim, letterSpacing: '0.06em' }}>AVI PRO SERVICES</p>
          </div>
          <p style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.04em' }}>Professional · Reliable · Quality</p>
          {data.phone && (
            <a href={`tel:${data.phone}`} style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.cyan, fontWeight: 600, textDecoration: 'none', padding: '7px 14px', background: 'rgba(56,189,248,0.06)', border: `1px solid rgba(56,189,248,0.15)`, borderRadius: 100 }}>
              <IconPhone size={11} /> Contact us
            </a>
          )}
        </footer>
      </div>
    </div>
  )
}
