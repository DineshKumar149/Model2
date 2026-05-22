'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Clapperboard, Bell, MessageSquare } from 'lucide-react'
import { useNotificationStore } from '@/store/useNotificationStore'
import { motion } from 'framer-motion'

export function BottomNav() {
  const pathname = usePathname()
  const { unreadCount } = useNotificationStore()

  const links = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/explore', icon: Search, label: 'Explore' },
    { href: '/reels', icon: Clapperboard, label: 'Reels' },
    { href: '/notifications', icon: Bell, label: 'Alerts', badge: unreadCount },
    { href: '/messages', icon: MessageSquare, label: 'Chat' },
  ]

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/auth')
  if (isAuthPage) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 xl:hidden border-t border-white/5 bg-zinc-950/95 backdrop-blur-xl">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {links.map(({ href, icon: Icon, label, badge }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition relative ${
                isActive ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                {badge !== undefined && badge > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-blue-500 text-white text-[9px] font-black flex items-center justify-center px-1">
                    {badge > 99 ? '99+' : badge}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottomNavActive"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
