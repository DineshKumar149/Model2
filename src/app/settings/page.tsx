'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  User, Lock, Bell, Shield, Palette, LogOut, Camera,
  ChevronRight, Eye, EyeOff, Save, Trash2, Globe, Users, UserX
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { useRouter } from 'next/navigation'
import { uploadMedia } from '@/lib/uploadMedia'

type Section = 'profile' | 'account' | 'notifications' | 'privacy' | 'appearance'

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('profile')

  const sections = [
    { key: 'profile' as const, icon: User, label: 'Edit Profile', desc: 'Photo, bio, name' },
    { key: 'account' as const, icon: Lock, label: 'Account', desc: 'Password, email' },
    { key: 'notifications' as const, icon: Bell, label: 'Notifications', desc: 'Push, email alerts' },
    { key: 'privacy' as const, icon: Shield, label: 'Privacy', desc: 'Visibility, blocking' },
    { key: 'appearance' as const, icon: Palette, label: 'Appearance', desc: 'Theme, display' },
  ]

  return (
    <div className="max-w-[600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/70 border-b border-white/5 px-4 py-4">
        <h1 className="text-xl font-black text-white">Settings</h1>
      </div>

      <div className="p-4 space-y-2">
        {sections.map(({ key, icon: Icon, label, desc }, i) => (
          <motion.button
            key={key}
            onClick={() => setSection(key)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition ${
              section === key ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              section === key ? 'bg-blue-500/20' : 'bg-white/10'
            }`}>
              <Icon className={`w-5 h-5 ${section === key ? 'text-blue-400' : 'text-zinc-400'}`} />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-semibold text-sm ${section === key ? 'text-white' : 'text-zinc-200'}`}>{label}</p>
              <p className="text-zinc-500 text-xs">{desc}</p>
            </div>
            <ChevronRight className={`w-4 h-4 ${section === key ? 'text-blue-400' : 'text-zinc-600'}`} />
          </motion.button>
        ))}

        {/* Expanded section */}
        {section === 'profile' && <ProfileSettings />}
        {section === 'account' && <AccountSettings />}
        {section === 'notifications' && <NotificationSettings />}
        {section === 'privacy' && <PrivacySettings />}
        {section === 'appearance' && <AppearanceSettings />}

        {/* Logout */}
        <LogoutButton />
      </div>
    </div>
  )
}

function ProfileSettings() {
  const { user, profile, setProfile } = useUserStore()
  const supabase = createClient()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [website, setWebsite] = useState(profile?.website || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    if (!user || !profile) return
    setSaving(true)
    const { data } = await supabase
      .from('profiles')
      .update({ display_name: displayName, bio, website })
      .eq('id', user.id)
      .select()
      .single()
    if (data) {
      setProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const url = await uploadMedia(file, 'avatars', user.id)
    if (url) {
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setProfile({ ...profile!, avatar_url: url })
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const url = await uploadMedia(file, 'avatars', user.id + '/cover')
    if (url) {
      await supabase.from('profiles').update({ cover_url: url }).eq('id', user.id)
      setProfile({ ...profile!, cover_url: url })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 rounded-2xl border border-white/10 p-4 space-y-4 mt-2"
    >
      <h3 className="text-white font-bold">Edit Profile</h3>

      {/* Cover photo */}
      <div>
        <p className="text-zinc-500 text-xs mb-2">Cover Photo</p>
        <div className="relative h-24 rounded-xl overflow-hidden bg-gradient-to-br from-blue-900 to-purple-900">
          {profile?.cover_url && <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />}
          <button
            onClick={() => coverRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition text-white"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">{profile?.display_name?.charAt(0)}</div>
            }
          </div>
          <button
            onClick={() => avatarRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 hover:opacity-100 transition text-white"
          >
            <Camera className="w-5 h-5" />
          </button>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <div>
          <p className="text-white font-bold">{profile?.display_name}</p>
          <p className="text-zinc-500 text-sm">@{profile?.username}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={160}
            className="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition resize-none"
          />
          <p className="text-xs text-zinc-600 text-right mt-1">{bio.length}/160</p>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
            className="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50'
        }`}
      >
        <Save className="w-4 h-4" />
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
      </button>
    </motion.div>
  )
}

function AccountSettings() {
  const { user } = useUserStore()
  const supabase = createClient()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleUpdatePassword = async () => {
    if (!newPw || newPw.length < 8) { setMsg('Password must be at least 8 characters'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) setMsg(error.message)
    else { setMsg('Password updated!'); setCurrentPw(''); setNewPw('') }
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 rounded-2xl border border-white/10 p-4 space-y-4 mt-2"
    >
      <h3 className="text-white font-bold">Account</h3>
      <div>
        <label className="text-xs text-zinc-500 block mb-1">Email</label>
        <p className="text-white text-sm bg-white/5 rounded-xl px-4 py-3 border border-white/10">{user?.email}</p>
      </div>
      <div>
        <label className="text-xs text-zinc-500 block mb-1">New Password</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 pr-12 text-white text-sm outline-none transition"
          />
          <button
            onClick={() => setShowPw(!showPw)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {msg && <p className={`text-sm ${msg.includes('updated') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
      <button
        onClick={handleUpdatePassword}
        disabled={saving || !newPw}
        className="w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm disabled:opacity-50 transition"
      >
        {saving ? 'Updating...' : 'Update Password'}
      </button>
    </motion.div>
  )
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    likes: true, comments: true, follows: true, messages: true, mentions: true, reposts: true
  })

  const toggle = (key: keyof typeof settings) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 rounded-2xl border border-white/10 p-4 space-y-3 mt-2"
    >
      <h3 className="text-white font-bold">Notifications</h3>
      {Object.entries(settings).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between py-2">
          <p className="text-zinc-200 text-sm capitalize">{key}</p>
          <button
            onClick={() => toggle(key as keyof typeof settings)}
            className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-zinc-700'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      ))}
    </motion.div>
  )
}

function PrivacySettings() {
  const [isPrivate, setIsPrivate] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 rounded-2xl border border-white/10 p-4 space-y-3 mt-2"
    >
      <h3 className="text-white font-bold">Privacy</h3>
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-zinc-400" />
          <div>
            <p className="text-zinc-200 text-sm font-medium">Private Account</p>
            <p className="text-zinc-500 text-xs">Only approved followers see your posts</p>
          </div>
        </div>
        <button
          onClick={() => setIsPrivate(!isPrivate)}
          className={`w-12 h-6 rounded-full transition-colors ${isPrivate ? 'bg-blue-500' : 'bg-zinc-700'}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
      <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
        <UserX className="w-5 h-5 text-zinc-400" />
        <span className="text-zinc-200 text-sm">Blocked Accounts</span>
        <ChevronRight className="w-4 h-4 text-zinc-600 ml-auto" />
      </button>
    </motion.div>
  )
}

function AppearanceSettings() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 rounded-2xl border border-white/10 p-4 space-y-3 mt-2"
    >
      <h3 className="text-white font-bold">Appearance</h3>
      <div>
        <p className="text-zinc-500 text-xs mb-2">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`py-2.5 rounded-xl text-sm font-medium capitalize transition ${
                theme === t
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function LogoutButton() {
  const supabase = createClient()
  const { clearAuth } = useUserStore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    clearAuth()
    router.push('/login')
  }

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={handleLogout}
      disabled={loading}
      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition mt-4 group"
    >
      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
        <LogOut className="w-5 h-5 text-red-400" />
      </div>
      <span className="text-red-400 font-semibold text-sm">{loading ? 'Signing out...' : 'Sign Out'}</span>
    </motion.button>
  )
}
