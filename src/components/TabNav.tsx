'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Meals', href: '/meals' },
  { label: 'Shopping', href: '/shopping' },
  { label: 'Budget', href: '/budget' },
]

export default function TabNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              active
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
