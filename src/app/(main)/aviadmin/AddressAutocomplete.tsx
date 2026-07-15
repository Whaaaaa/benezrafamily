'use client'

import { useState, useEffect, useRef, useCallback, forwardRef } from 'react'

type NominatimAddress = {
  house_number?: string
  road?: string
  neighbourhood?: string
  suburb?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
}

type NominatimResult = {
  place_id: number
  display_name: string
  address?: NominatimAddress
}

export function ensureIsraelSuffix(address: string): string {
  const trimmed = address.trim()
  if (!trimmed) return trimmed
  if (/israel|ישראל/i.test(trimmed)) return trimmed
  return `${trimmed}, Israel`
}

function formatResult(r: NominatimResult): string {
  const a = r.address ?? {}
  const street = [a.road, a.house_number].filter(Boolean).join(' ')
  const locality = a.city || a.town || a.village || a.municipality || a.suburb || a.county || ''
  const parts = [street, locality].filter(Boolean)
  return parts.length ? `${parts.join(', ')}, Israel` : ensureIsraelSuffix(r.display_name)
}

export const AddressAutocomplete = forwardRef<HTMLInputElement, {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}>(function AddressAutocomplete({ value, onChange, placeholder, className }, ref) {
  const [results, setResults] = useState<NominatimResult[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
  }, [])

  const search = useCallback((query: string) => {
    abortRef.current?.abort()
    if (query.trim().length < 3) {
      setResults([])
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=il&accept-language=en`,
      { headers: { 'User-Agent': 'AviadminCalendar/1.0' }, signal: controller.signal }
    )
      .then(res => res.json())
      .then((data: NominatimResult[]) => { setResults(data); setOpen(true) })
      .catch(err => { if (err.name !== 'AbortError') setResults([]) })
  }, [])

  function handleChange(v: string) {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 400)
  }

  function selectResult(r: NominatimResult) {
    onChange(formatResult(r))
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={ref}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => onChange(ensureIsraelSuffix(value))}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-h-56 overflow-y-auto">
          {results.map(r => (
            <li
              key={r.place_id}
              onMouseDown={e => { e.preventDefault(); selectResult(r) }}
              className="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-teal-50 hover:text-teal-700 transition-colors"
            >
              {formatResult(r)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})
