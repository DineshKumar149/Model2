'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, Compass, Flame, Send, EyeOff, Sparkles, Navigation, 
  Layers, Search, ShieldAlert, X, MessageSquare, Play, Heart
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'

interface MapUser {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  location: string
  x: number // Map coordinate percentage
  y: number // Map coordinate percentage
  streak: number
  active_story_url?: string
  last_active?: string
  bio?: string
}

export default function SnapMapPage() {
  const { user } = useUserStore()
  const supabase = createClient()
  const [ghostMode, setGhostMode] = useState(false)
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null)
  const [activeCategory, setActiveCategory] = useState<'all' | 'friends' | 'hotspots'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Predefined mock users placed on a beautiful stylistic interactive dark vector grid
  const mapUsers: MapUser[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      username: 'alex_travels',
      display_name: 'Alex Travels',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
      location: 'Paris, France',
      x: 48,
      y: 35,
      streak: 34,
      active_story_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&h=1000&q=80',
      last_active: '2m ago',
      bio: 'Adventure seeker 🌍 | Photographer in 45+ countries.'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      username: 'marcus_tech',
      display_name: 'Marcus Tech',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
      location: 'Tokyo, Japan',
      x: 78,
      y: 42,
      streak: 52,
      active_story_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&h=1000&q=80',
      last_active: '15m ago',
      bio: 'Tech Creator 💻 | Reviewing tomorrow\'s gadgets today.'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      username: 'sophia_style',
      display_name: 'Sophia Style',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
      location: 'London, UK',
      x: 44,
      y: 28,
      streak: 18,
      active_story_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&h=1000&q=80',
      last_active: 'Just Now',
      bio: 'Fashion Designer & Creative Director ✨'
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      username: 'leo_chats',
      display_name: 'Leo Chats',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
      location: 'Rome, Italy',
      x: 52,
      y: 45,
      streak: 27,
      last_active: '1h ago',
      bio: 'Full-stack builder & community manager at Nova.'
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      username: 'nova_official',
      display_name: 'Nova Official',
      avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&h=150&q=80',
      location: 'San Francisco, USA',
      x: 20,
      y: 38,
      streak: 105,
      last_active: 'Active',
      bio: 'System updates and announcements!'
    }
  ]

  const hotspots = [
    { name: 'Eiffel Tower', count: 124, x: 47, y: 33 },
    { name: 'Shibuya Crossing', count: 384, x: 79, y: 40 },
    { name: 'Times Square', count: 219, x: 26, y: 34 }
  ]

  const filteredUsers = mapUsers.filter(u => {
    const matchesSearch = u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.location.toLowerCase().includes(searchQuery.toLowerCase())
    if (activeCategory === 'friends') return matchesSearch && u.streak > 20
    return matchesSearch
  })

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-zinc-950 text-white flex flex-col md:flex-row">
      {/* LEFT SIDEBAR CONTROLS */}
      <div className="w-full md:w-80 shrink-0 bg-zinc-900/40 backdrop-blur-xl border-b md:border-b-0 md:border-r border-white/5 p-4 flex flex-col z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Compass className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-amber-200 to-white bg-clip-text text-transparent">Snap Map</h1>
          </div>
          <button 
            onClick={() => setGhostMode(!ghostMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              ghostMode 
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {ghostMode ? <EyeOff className="w-3 h-3" /> : <Navigation className="w-3 h-3" />}
            <span>{ghostMode ? 'Ghost Mode' : 'Sharing'}</span>
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search friends or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-yellow-500/50 transition-colors"
          />
        </div>

        {/* FILTER CATEGORIES */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-xl border border-white/5 mb-4 text-xs font-medium">
          {(['all', 'friends', 'hotspots'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`py-1.5 rounded-lg capitalize transition ${
                activeCategory === cat 
                  ? 'bg-yellow-500 text-black font-semibold' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FRIENDS LIST */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Active Friends</h2>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <div 
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition border ${
                  selectedUser?.id === u.id 
                    ? 'bg-white/10 border-white/10' 
                    : 'bg-transparent border-transparent hover:bg-white/[0.03]'
                }`}
              >
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br p-[2px] ${u.active_story_url ? 'from-yellow-400 to-pink-500' : 'from-zinc-700 to-zinc-800'}`}>
                    <img 
                      src={u.avatar_url || ''} 
                      alt="" 
                      className="w-full h-full object-cover rounded-full bg-zinc-900"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center">
                    <span className="text-[10px]">📍</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate">{u.display_name}</span>
                    <span className="text-[10px] text-zinc-500">{u.last_active}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
                    <MapPin className="w-3 h-3 text-red-400" />
                    <span>{u.location}</span>
                  </div>
                </div>
                {u.streak > 0 && (
                  <div className="flex items-center gap-0.5 text-xs text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                    <Flame className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{u.streak}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-zinc-500 text-sm">No friends match filters</div>
          )}
        </div>

        {/* SECURITY REMINDER */}
        <div className="mt-4 p-3 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex gap-2.5 items-start">
          <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-purple-300">
            <span className="font-bold">Security Notice: </span>
            Ghost Mode disables active tracking and conceals your location coordinates from other users.
          </div>
        </div>
      </div>

      {/* INTERACTIVE VECTOR MAP CONTAINER */}
      <div className="flex-1 relative bg-[#0b0c10] overflow-hidden flex items-center justify-center">
        {/* World Grid Lines Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none transition-transform duration-300"
          style={{ 
            backgroundImage: 'radial-gradient(circle, #2d3748 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            transform: `scale(${zoomLevel})`
          }}
        />

        {/* Glowing Compass Card Overlay */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <div className="flex bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-2xl">
            <button 
              onClick={() => setZoomLevel(Math.min(zoomLevel + 0.25, 2))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold hover:bg-white/10 transition"
            >
              +
            </button>
            <button 
              onClick={() => setZoomLevel(Math.max(zoomLevel - 0.25, 0.5))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold hover:bg-white/10 transition"
            >
              -
            </button>
          </div>
        </div>

        {/* MAP CONTENT CANVAS */}
        <div 
          className="relative w-full max-w-[900px] aspect-[16/10] bg-zinc-950/60 border border-white/5 rounded-3xl overflow-hidden shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Custom SVG Dark Continents Contour Map */}
          <svg className="absolute inset-0 w-full h-full text-zinc-900 opacity-25 fill-current" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Simulated continents/regions contours */}
            <path d="M5,25 Q15,15 25,28 T40,30 T55,20 T70,35 T85,25 T95,30 L95,65 Q85,55 75,68 T60,60 T45,75 T30,65 T15,70 Z" />
            <path d="M20,75 Q30,65 40,78 T55,75 T70,85 T80,72 L85,95 L15,95 Z" />
          </svg>

          {/* Interactive Hotspot Ripples */}
          {activeCategory !== 'friends' && hotspots.map((h, idx) => (
            <div 
              key={idx}
              className="absolute"
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
            >
              <div className="absolute w-12 h-12 -left-6 -top-6 rounded-full bg-yellow-500/10 animate-ping" />
              <div className="absolute w-6 h-6 -left-3 -top-3 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
              </div>
              <div className="absolute top-4 -left-12 w-24 text-center">
                <span className="text-[9px] font-bold text-yellow-500/80 bg-zinc-900/90 border border-yellow-500/20 px-1 py-0.5 rounded-md backdrop-blur-sm">
                  🔥 {h.count} views
                </span>
              </div>
            </div>
          ))}

          {/* User Pins */}
          {filteredUsers.map((u) => (
            <motion.div
              key={u.id}
              className="absolute cursor-pointer z-10"
              style={{ left: `${u.x}%`, top: `${u.y}%` }}
              whileHover={{ scale: 1.15, zIndex: 30 }}
              onClick={() => setSelectedUser(u)}
            >
              {/* Active story outer ring animation */}
              <div className="relative flex items-center justify-center">
                {u.active_story_url && (
                  <motion.div 
                    className="absolute w-12 h-12 rounded-full border-2 border-yellow-400 border-dashed"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  />
                )}
                
                {/* User Avatar pin */}
                <div className="w-9 h-9 rounded-full bg-zinc-900 border-2 border-white overflow-hidden shadow-2xl relative">
                  <img 
                    src={u.avatar_url || ''} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Micro pointer */}
                <div className="absolute -bottom-1 w-2.5 h-2.5 bg-white rotate-45 border-r border-b border-white/20 shadow-lg" />
              </div>

              {/* Mini Label badge */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap shadow-xl">
                <span className="text-[10px] font-semibold text-zinc-200">
                  {u.display_name.split(' ')[0]}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Logged in User Simulated Location Marker (if not in Ghost Mode) */}
          {!ghostMode && (
            <motion.div 
              className="absolute left-[38%] top-[55%] z-10 flex flex-col items-center cursor-pointer"
              whileHover={{ scale: 1.1 }}
              onClick={() => {
                setSelectedUser({
                  id: '380b3093-8db9-4c84-98ae-f0bec9178a29',
                  username: 'tester',
                  display_name: 'You (Beta Tester)',
                  avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
                  location: 'London, UK (Simulated)',
                  x: 38,
                  y: 55,
                  streak: 0,
                  bio: 'You are viewing active friends!'
                })
              }}
            >
              <div className="relative">
                <div className="absolute w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 animate-ping -left-1 -top-1" />
                <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-lg relative z-10">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              </div>
              <span className="text-[9px] font-bold text-blue-400 bg-zinc-900/80 border border-blue-500/20 px-1.5 py-0.5 rounded-full mt-1.5 backdrop-blur-xs whitespace-nowrap">
                Me
              </span>
            </motion.div>
          )}
        </div>

        {/* BOTTOM USER DETAILS DISPLAY CARD */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="absolute bottom-6 left-6 right-6 max-w-xl mx-auto bg-zinc-900/80 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-2xl z-20 flex flex-col sm:flex-row gap-4"
            >
              {/* Card close */}
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-3 right-3 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Story/Avatar section */}
              <div className="flex flex-col items-center shrink-0">
                {selectedUser.active_story_url ? (
                  <div 
                    onClick={() => setShowStoryViewer(true)}
                    className="relative cursor-pointer group"
                  >
                    <div className="w-18 h-18 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[3px]">
                      <img 
                        src={selectedUser.avatar_url || ''} 
                        alt="" 
                        className="w-full h-full object-cover rounded-full bg-zinc-900"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                      <Play className="w-5 h-5 text-white fill-white shrink-0" />
                    </div>
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-yellow-500 text-black px-1.5 py-0.5 rounded-full uppercase shadow">
                      Story
                    </span>
                  </div>
                ) : (
                  <div className="w-18 h-18 rounded-full bg-zinc-800 border border-white/5 overflow-hidden flex items-center justify-center">
                    <img 
                      src={selectedUser.avatar_url || ''} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {selectedUser.streak > 0 && (
                  <div className="flex items-center gap-0.5 text-xs text-amber-500 font-extrabold mt-3 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/15">
                    <Flame className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{selectedUser.streak} streaks</span>
                  </div>
                )}
              </div>

              {/* Meta details */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-lg">{selectedUser.display_name}</h3>
                    <span className="text-zinc-500 text-sm">@{selectedUser.username}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    <span className="font-semibold text-zinc-300">{selectedUser.location}</span>
                    <span>·</span>
                    <span className="text-zinc-500">Active {selectedUser.last_active || 'recently'}</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed line-clamp-2">
                    {selectedUser.bio || 'No status bio provided.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                  <Link 
                    href={`/messages`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-xs py-2 rounded-xl transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Chat Now</span>
                  </Link>
                  <Link 
                    href={`/profile/${selectedUser.username}`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold text-xs py-2 rounded-xl transition"
                  >
                    <span>View Profile</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FULLSCREEN DISAPPEARING STORY VIEWER */}
        <AnimatePresence>
          {showStoryViewer && selectedUser?.active_story_url && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md"
            >
              <div className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                {/* Disappearing Story Timeline header */}
                <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2">
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-white"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                      onAnimationComplete={() => setShowStoryViewer(false)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden">
                        <img src={selectedUser.avatar_url || ''} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-bold text-white drop-shadow-md">{selectedUser.display_name}</span>
                    </div>
                    <button 
                      onClick={() => setShowStoryViewer(false)}
                      className="p-1 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Story Image */}
                <img 
                  src={selectedUser.active_story_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />

                {/* Story Caption Overlay */}
                <div className="absolute bottom-6 left-4 right-4 bg-gradient-to-t from-black/80 to-transparent p-4 text-center rounded-2xl">
                  <p className="text-sm font-semibold text-white leading-relaxed drop-shadow">
                    {selectedUser.username === 'alex_travels' ? 'Sunrise at the beach! 🌅🏝️' :
                     selectedUser.username === 'marcus_tech' ? 'Desk setup finalized. Clutter-free coding environment. ⚡💻' :
                     'Styling for today\'s shoot. Soft pink matches everything! 💕🧥'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
