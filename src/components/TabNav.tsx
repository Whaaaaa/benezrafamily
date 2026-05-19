'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: '🏠', title: 'Home',     href: '/',         exact: true },
  { label: '🍽️', title: 'Meals',    href: '/meals',    exact: false },
  { label: '🛒', title: 'Shopping', href: '/shopping', exact: false },
  { label: '💰', title: 'Budget',   href: '/budget',   exact: false },
]

const GRADIENTS = [
  'linear-gradient(135deg, #7C3AED, #EC4899)',
  'linear-gradient(135deg, #A855F7, #7C3AED)',
  'linear-gradient(135deg, #EC4899, #F43F5E)',
  'linear-gradient(135deg, #F59E0B, #EF4444)',
]

export default function TabNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1.5 pb-3">
      {tabs.map((tab, i) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-sm font-bold rounded-full transition-all duration-200 ${
              active
                ? 'text-white shadow-lg scale-105'
                : 'text-gray-500 hover:text-gray-800 hover:bg-white/70 hover:scale-105'
            }`}
            style={active ? { background: GRADIENTS[i], boxShadow: '0 4px 15px rgba(0,0,0,0.15)' } : {}}
          >
            <span>{tab.label}</span>
            <span className="hidden sm:inline">{tab.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}
