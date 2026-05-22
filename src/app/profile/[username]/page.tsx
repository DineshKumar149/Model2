'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Post } from '@/types'
import { useUserStore } from '@/store/useUserStore'
import { Settings, MapPin, Link as LinkIcon, Calendar } from 'lucide-react'
import { format } from 'date-fns'

export default function ProfilePage({ params }: { params: { username: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const { user } = useUserStore()
  const supabase = createClient()
  const isOwnProfile = user && profile && user.id === profile.id

  useEffect(() => {
    fetchProfile()
  }, [params.username])

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('username', params.username).single()
    if (data) {
      setProfile(data)
      const { data: userPosts } = await supabase.from('posts').select('*, media_files(*)').eq('user_id', data.id).order('created_at', { ascending: false })
      if (userPosts) setPosts(userPosts)
    }
  }

  if (!profile) return <div className="p-8 text-center">Loading profile...</div>

  return (
    <div className="max-w-4xl mx-auto min-h-screen border-x bg-background pb-20">
      {/* Cover Photo */}
      <div className="h-48 md:h-64 bg-secondary w-full relative">
        {profile.cover_url && <img src={profile.cover_url} className="w-full h-full object-cover" />}
      </div>

      <div className="px-4 sm:px-8 relative">
        {/* Avatar & Actions */}
        <div className="flex justify-between items-start -mt-16 mb-4">
          <div className="w-32 h-32 rounded-full border-4 border-background bg-secondary overflow-hidden shrink-0">
            {profile.avatar_url && <img src={profile.avatar_url} className="w-full h-full object-cover" />}
          </div>
          
          <div className="pt-20 flex gap-3">
            {isOwnProfile ? (
              <button className="px-5 py-2 rounded-full font-bold border hover:bg-secondary transition-colors">
                Edit Profile
              </button>
            ) : (
              <button className="px-6 py-2 rounded-full font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                Follow
              </button>
            )}
            <button className="p-2 rounded-full border hover:bg-secondary transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bio Section */}
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-black">{profile.display_name}</h1>
            <p className="text-muted-foreground font-medium">@{profile.username}</p>
          </div>
          
          <p className="text-[15px] leading-relaxed max-w-2xl">{profile.bio || 'This user has no bio yet.'}</p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium">
            <div className="flex items-center gap-1"><MapPin className="w-4 h-4"/> Earth</div>
            {profile.website && (
              <a href={profile.website} target="_blank" className="flex items-center gap-1 text-blue-500 hover:underline">
                <LinkIcon className="w-4 h-4"/> {profile.website.replace('https://', '')}
              </a>
            )}
            <div className="flex items-center gap-1"><Calendar className="w-4 h-4"/> Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-1 cursor-pointer hover:underline">
              <span className="font-bold text-foreground">0</span> <span className="text-muted-foreground text-sm">Following</span>
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:underline">
              <span className="font-bold text-foreground">0</span> <span className="text-muted-foreground text-sm">Followers</span>
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="flex w-full border-b mt-8">
          <button className="flex-1 py-4 font-bold text-primary border-b-2 border-primary">Posts</button>
          <button className="flex-1 py-4 font-bold text-muted-foreground hover:bg-secondary/50 transition-colors">Replies</button>
          <button className="flex-1 py-4 font-bold text-muted-foreground hover:bg-secondary/50 transition-colors">Media</button>
          <button className="flex-1 py-4 font-bold text-muted-foreground hover:bg-secondary/50 transition-colors">Likes</button>
        </div>

        {/* Posts Grid */}
        <div className="divide-y mt-4">
          {posts.map((post) => (
             <article key={post.id} className="py-6 hover:bg-secondary/10 transition-colors px-2 rounded-xl">
              <p className="text-[15px]">{post.content}</p>
              {post.media_files && post.media_files.length > 0 && (
                <div className="mt-4 rounded-2xl overflow-hidden border">
                  <img src={post.media_files[0].url} alt="" className="w-full h-auto" />
                </div>
              )}
             </article>
          ))}
          {posts.length === 0 && (
            <div className="py-20 text-center text-muted-foreground font-medium">
              @{profile.username} hasn't posted anything yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
