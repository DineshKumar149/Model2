'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, MessageSquare, Bell, User, Settings, Search,
  Clapperboard, Bookmark, Hash, Radio, LogOut, Zap
} from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export function Sidebar() {
  const pathname = usePathname()
  const { profile, clearAuth } = useUserStore()
  const { unreadCount } = useNotificationStore()
  const router = useRouter()
  const supabase = createClient()

  const mainLinks = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/explore', icon: Search, label: 'Explore' },
    { href: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount },
    { href: '/messages', icon: MessageSquare, label: 'Messages' },
    { href: '/reels', icon: Clapperboard, label: 'Reels' },
    { href: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
    { href: '/channels', icon: Radio, label: 'Channels' },
    { href: profile ? `/profile/${profile.username}` : '/login', icon: User, label: 'Profile' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearAuth()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 md:w-64 border-r border-white/5 bg-zinc-950/90 backdrop-blur-xl flex flex-col items-center md:items-start py-6 px-2 md:px-4 z-40 transition-all">
      {/* Logo */}
      <Link href="/" className="mb-8 px-2 flex items-center gap-3 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
          <Zap className="w-5 h-5 text-white fill-white" />
        </div>
        <span className="hidden md:block text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Nova
        </span>
      </Link>

      {/* Main nav */}
      <nav className="flex-1 w-full space-y-1">
        {mainLinks.map((link) => {
          const isActive = link.href === '/'
            ? pathname === '/'
            : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-4 px-3 py-3 rounded-2xl transition-all group relative ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="relative">
                <link.icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${isActive ? 'fill-current' : ''}`} />
                {/* Notification badge */}
                {link.badge !== undefined && link.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center px-1"
                  >
                    {link.badge > 99 ? '99+' : link.badge}
                  </motion.div>
                )}
              </div>
              <span className={`hidden md:block text-[15px] font-medium transition ${isActive ? 'font-bold' : ''}`}>
                {link.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="sidebarActive"
                  className="hidden md:block absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full -left-4"
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Settings + Profile */}
      <div className="w-full space-y-1 mt-4">
        <Link
          href="/settings"
          className="flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/5 text-zinc-500 hover:text-white transition group"
        >
          <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform" />
          <span className="hidden md:block text-[15px] font-medium">Settings</span>
        </Link>

        {/* Profile mini card */}
        {profile && (
          <Link
            href={`/profile/${profile.username}`}
            className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 transition group"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                  {profile.display_name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="hidden md:block flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{profile.display_name}</p>
              <p className="text-zinc-500 text-xs truncate">@{profile.username}</p>
            </div>
            <LogOut
              onClick={async (e) => { e.preventDefault(); handleLogout() }}
              className="hidden md:block w-4 h-4 text-zinc-600 hover:text-red-400 ml-auto transition opacity-0 group-hover:opacity-100"
            />
          </Link>
        )}
      </div>
    </aside>
  )
}
