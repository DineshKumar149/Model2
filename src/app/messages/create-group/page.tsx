'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Users, Check, Search, Info, Camera, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { Profile } from '@/types'
import { uploadMedia } from '@/lib/uploadMedia'

const MOCK_GROUP_AVATARS = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=150',
]

export default function CreateGroupPage() {
  const { user } = useUserStore()
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  // Group details state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(MOCK_GROUP_AVATARS[0])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchProfiles()
  }, [user])

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)
        .order('display_name', { ascending: true })
      
      if (data) setProfiles(data as Profile[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const url = await uploadMedia(file, 'avatars', `${user.id}_group_${Date.now()}`)
      if (url) {
        setAvatarUrl(url)
      }
    } catch (err) {
      console.error('Error uploading group avatar:', err)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !user || submitting) return
    if (selectedUserIds.length === 0) {
      alert('Please select at least one member to join the group.')
      return
    }

    setSubmitting(true)
    try {
      // 1. Insert chat row
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          is_group: true,
          name: title.trim(),
          avatar_url: avatarUrl,
        })
        .select()
        .single()

      if (chatError || !newChat) {
        throw chatError || new Error('Failed to create group.')
      }

      // 2. Insert chat participants (creator + selected members)
      const participantsData = [
        { chat_id: newChat.id, user_id: user.id, is_admin: true }, // creator is admin
        ...selectedUserIds.map((userId) => ({
          chat_id: newChat.id,
          user_id: userId,
          is_admin: false,
        })),
      ]

      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(participantsData)

      if (partError) {
        throw partError
      }

      // 3. Send initial bot message or welcome message
      await supabase.from('messages').insert({
        chat_id: newChat.id,
        sender_id: user.id,
        content: `🎉 Group created: "${title.trim()}"! Let's get the conversation started.`,
      })

      // 4. Redirect
      router.push(`/messages/${newChat.id}`)
    } catch (err) {
      console.error('Group creation failed:', err)
      alert('Failed to initialize group chat. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase()
    return (
      p.display_name?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col h-screen bg-zinc-950 max-w-[800px] mx-auto border-x border-white/5">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5 bg-zinc-900/60 backdrop-blur-xl shrink-0">
        <button
          onClick={() => router.push('/messages')}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Create Group Chat</h1>
          <p className="text-xs text-zinc-500">Initiate a multi-user direct conversation</p>
        </div>
      </div>

      {/* Main Form content */}
      <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          
          {/* Details Section */}
          <div className="md:col-span-2 space-y-5">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Group Profile
              </h2>

              {/* Avatar Selector */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden bg-zinc-800 border-2 border-blue-500/50 shadow-lg">
                  {uploadingAvatar ? (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <img src={avatarUrl} alt="Group Avatar" className="w-full h-full object-cover" />
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition cursor-pointer">
                        <Camera className="w-4 h-4 mb-1" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarFileChange}
                        />
                      </label>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {MOCK_GROUP_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-7 h-7 rounded-full overflow-hidden border-2 transition ${
                        avatarUrl === url ? 'border-blue-500 scale-110' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dream Team"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-blue-500/50 transition placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="What is this group about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-blue-500/50 transition placeholder:text-zinc-600 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Selected Count */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white text-xs font-bold">Selected Members</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Need at least 1 person</p>
              </div>
              <span className="bg-blue-500 text-white text-xs font-black rounded-full px-3 py-1">
                {selectedUserIds.length}
              </span>
            </div>

            {/* Create Button */}
            <button
              type="submit"
              disabled={submitting || !title.trim() || selectedUserIds.length === 0}
              className={`w-full py-3 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition ${
                submitting || !title.trim() || selectedUserIds.length === 0
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                  : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30'
              }`}
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Initialize Group Chat
                </>
              )}
            </button>
          </div>

          {/* Members List Selector Section */}
          <div className="md:col-span-3 bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col h-[520px]">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-purple-400" />
              Select Participants
            </h2>

            {/* Search */}
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-600 outline-none focus:border-purple-500/30 transition"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 items-center p-2.5 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-white/10" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-white/10 rounded w-1/3" />
                      <div className="h-2.5 bg-white/10 rounded w-1/4" />
                    </div>
                  </div>
                ))
              ) : filteredProfiles.length === 0 ? (
                <div className="text-center py-20 text-zinc-600 text-xs">
                  No matching profiles found
                </div>
              ) : (
                filteredProfiles.map((p) => {
                  const isChecked = selectedUserIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleUserSelection(p.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition text-left group ${
                        isChecked
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : 'bg-transparent border-transparent hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                              {p.display_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-bold truncate group-hover:text-purple-300 transition">
                            {p.display_name}
                          </p>
                          <p className="text-zinc-500 text-[10px] truncate">@{p.username}</p>
                        </div>
                      </div>

                      {/* Checkbox item */}
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition border ${
                          isChecked
                            ? 'bg-purple-500 border-purple-500 text-white'
                            : 'border-white/25 text-transparent group-hover:border-white/50'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}
