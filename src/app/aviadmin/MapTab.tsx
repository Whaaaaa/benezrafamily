'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type Job = {
  id: string; customer_id: string; customer_name: string; customer_phone: string; customer_address: string
  notes: string; first_hour_rate: number; additional_hour_rate: number; created_at: string
}
type JobEvent = { id: string; job_id: string; start_time: string; end_time: string }

interface Props { jobs: Job[]; jobEvents: JobEvent[] }

type MapEntry = { job: Job; event: JobEvent | null }

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IL', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function ensureLeaflet(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as Window & { L?: unknown }).L) return Promise.resolve()

  return new Promise(resolve => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    const existing = document.getElementById('leaflet-js')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      return
    }
    const s = document.createElement('script')
    s.id = 'leaflet-js'
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.onload = () => resolve()
    document.head.appendChild(s)
  })
}

export default function MapTab({ jobs, jobEvents }: Props) {
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [showAll, setShowAll] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [noAddress, setNoAddress] = useState<string[]>([])
  const mapElRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<unknown>(null)
  const geocache = useRef<Record<string, [number, number] | null>>({})

  const mapEntries: MapEntry[] = showAll
    ? (() => {
        const seen = new Set<string>()
        return jobs
          .filter(j => {
            if (!j.customer_address?.trim()) return false
            if (seen.has(j.customer_id)) return false
            seen.add(j.customer_id)
            return true
          })
          .map(j => ({ job: j, event: null }))
      })()
    : jobEvents
        .filter(ev => {
          const d = ev.start_time.slice(0, 10)
          return d >= startDate && d <= endDate
        })
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map(ev => ({ event: ev, job: jobs.find(j => j.id === ev.job_id)! }))
        .filter((x): x is { event: JobEvent; job: Job } => Boolean(x.job))

  async function geocodeAddress(address: string): Promise<[number, number] | null> {
    if (!address?.trim()) return null
    if (address in geocache.current) return geocache.current[address]
    await new Promise(r => setTimeout(r, 350))
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'AviadminCalendar/1.0' } }
      )
      const data = await res.json() as { lat: string; lon: string }[]
      const coords = data.length > 0
        ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number]
        : null
      geocache.current[address] = coords
      return coords
    } catch { return null }
  }

  useEffect(() => {
    let cancelled = false

    async function setup() {
      await ensureLeaflet()
      if (cancelled || !mapElRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L

      if (leafletMapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (leafletMapRef.current as any).remove()
        leafletMapRef.current = null
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapElRef.current).setView([32.07, 34.79], 11)
      leafletMapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      if (mapEntries.length === 0) return

      setGeocoding(true)
      const missing: string[] = []
      const bounds: [number, number][] = []

      for (let i = 0; i < mapEntries.length; i++) {
        if (cancelled) break
        const { event, job } = mapEntries[i]
        const address = job.customer_address?.trim()

        const coords = await geocodeAddress(address)
        if (!coords) {
          if (address) missing.push(job.customer_name)
          continue
        }

        bounds.push(coords)

        const stopNum = i + 1
        const pinHtml = `
          <div style="
            width:32px;height:32px;border-radius:50%;
            background:#0d9488;border:3px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,.35);
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:700;font-size:13px;font-family:sans-serif
          ">${stopNum}</div>`
        const icon = L.divIcon({ className: '', html: pinHtml, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -20] })

        const popup = `
          <div style="min-width:170px;font-family:sans-serif;line-height:1.5">
            <div style="font-weight:700;font-size:14px;color:#1e293b">${stopNum}. ${job.customer_name}</div>
            ${job.customer_phone ? `<div style="font-size:12px;color:#475569">📞 ${job.customer_phone}</div>` : ''}
            ${address ? `<div style="font-size:12px;color:#475569">📍 ${address}</div>` : ''}
            ${event ? `<div style="font-size:12px;color:#0d9488;font-weight:600">🕐 ${fmtTime(event.start_time)}–${fmtTime(event.end_time)}</div>` : ''}
          </div>`

        L.marker(coords, { icon }).addTo(map).bindPopup(popup)
      }

      if (!cancelled) {
        setNoAddress(missing)
        setGeocoding(false)
        if (bounds.length === 1) {
          map.setView(bounds[0], 14)
        } else if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [50, 50] })
        }
      }
    }

    setup()
    return () => {
      cancelled = true
      setGeocoding(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, showAll, jobs, jobEvents])

  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (leafletMapRef.current as any).remove()
        leafletMapRef.current = null
      }
    }
  }, [])

  function clearFilters() {
    setShowAll(false)
    setStartDate(todayStr())
    setEndDate(todayStr())
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 60px - 56px)' }}>
      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
        {showAll ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-teal-700 flex-1">All Clients</span>
            <button
              onClick={clearFilters}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
            >
              Clear Filters
            </button>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-gray-700">{mapEntries.length}</p>
              <p className="text-[10px] text-gray-400 leading-none">client{mapEntries.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <span className="text-gray-400 text-xs font-medium">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={() => setShowAll(true)}
              className="text-xs px-3 py-2 rounded-xl bg-teal-50 text-teal-700 font-semibold hover:bg-teal-100 transition-colors flex-shrink-0"
            >
              All
            </button>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-gray-700">{mapEntries.length}</p>
              <p className="text-[10px] text-gray-400 leading-none">stop{mapEntries.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}
      </div>

      {/* Status strip */}
      {(geocoding || noAddress.length > 0) && (
        <div className={`px-4 py-1.5 text-xs flex-shrink-0 ${geocoding ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'}`}>
          {geocoding
            ? '📍 Finding locations…'
            : `⚠ No address: ${noAddress.join(', ')}`}
        </div>
      )}

      {/* Map */}
      <div ref={mapElRef} className="flex-1 z-0" />

      {/* Stop list */}
      <div className="bg-gray-50 border-t border-gray-100 overflow-y-auto flex-shrink-0" style={{ maxHeight: 200 }}>
        {mapEntries.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">
            {showAll ? 'No clients with addresses.' : 'No appointments in this date range.'}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {mapEntries.map(({ event, job }, i) => (
              <Link key={event?.id ?? job.id} href={`/aviadmin/customers/${job.customer_id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white transition-colors">
                <div className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{job.customer_name}</p>
                  {job.customer_address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.customer_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-gray-400 truncate hover:text-teal-600 hover:underline block"
                    >
                      📍 {job.customer_address}
                    </a>
                  )}
                </div>
                {event && (
                  <p className="text-xs text-teal-600 font-semibold flex-shrink-0">
                    {fmtTime(event.start_time)}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
