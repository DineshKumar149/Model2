'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageSquare, Bell, User, Settings, Search } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'

export function Sidebar() {
  const pathname = usePathname()
  const { profile } = useUserStore()

  const links = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Explore' },
    { href: '/messages', icon: MessageSquare, label: 'Messages' },
    { href: '/notifications', icon: Bell, label: 'Notifications' },
    { href: profile ? `/profile/${profile.username}` : '/login', icon: User, label: 'Profile' },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 md:w-64 border-r bg-card flex flex-col items-center md:items-start py-8 px-4 z-40 transition-all">
      <div className="mb-12 px-2 hidden md:block">
        <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          SOCIAL
        </h1>
      </div>

      <nav className="flex-1 w-full space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-primary text-primary-foreground font-bold shadow-md scale-105' 
                  : 'hover:bg-secondary text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              <link.icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
              <span className="hidden md:block text-[15px]">{link.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto w-full">
        <Link
          href="/settings"
          className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-secondary text-muted-foreground transition-all"
        >
          <Settings className="w-6 h-6" />
          <span className="hidden md:block font-medium">Settings</span>
        </Link>
      </div>
    </aside>
  )
}
