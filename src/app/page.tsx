'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/types'
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const { user } = useUserStore()
  const supabase = createClient()

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(*), media_files(*)')
      .order('created_at', { ascending: false })
      
    if (!error && data) {
      setPosts(data)
    }
  }

  const [content, setContent] = useState('')

  const handleCreatePost = async () => {
    if (!content.trim() || !user) return
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content
    })
    if (!error) {
      setContent('')
      fetchPosts()
    }
  }

  return (
    <div className="max-w-2xl mx-auto min-h-screen border-x">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-4">
        <h1 className="text-xl font-bold">Home</h1>
      </div>

      {user && (
        <div className="p-4 border-b flex flex-col gap-4">
          <textarea
            className="w-full bg-transparent resize-none outline-none text-lg placeholder:text-muted-foreground"
            placeholder="What's on your mind?"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end">
            <button 
              onClick={handleCreatePost}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-bold hover:opacity-90 transition-opacity"
            >
              Post
            </button>
          </div>
        </div>
      )}

      <div className="divide-y">
        {posts.map((post) => (
          <article key={post.id} className="p-4 hover:bg-secondary/20 transition-colors">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary shrink-0 overflow-hidden">
                {post.profiles?.avatar_url && (
                  <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold hover:underline cursor-pointer">{post.profiles?.display_name}</span>
                    <span className="text-muted-foreground ml-2 text-sm">@{post.profiles?.username}</span>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
                
                <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                
                {post.media_files && post.media_files.length > 0 && (
                  <div className="mt-3 rounded-2xl overflow-hidden border">
                    <img src={post.media_files[0].url} alt="Post media" className="w-full h-auto" />
                  </div>
                )}

                <div className="flex items-center gap-6 mt-4 text-muted-foreground">
                  <button className="flex items-center gap-2 hover:text-blue-500 transition-colors group">
                    <div className="p-2 rounded-full group-hover:bg-blue-500/10"><MessageCircle className="w-5 h-5" /></div>
                    <span className="text-sm">0</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-pink-500 transition-colors group">
                    <div className="p-2 rounded-full group-hover:bg-pink-500/10"><Heart className="w-5 h-5" /></div>
                    <span className="text-sm">0</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-green-500 transition-colors group">
                    <div className="p-2 rounded-full group-hover:bg-green-500/10"><Share2 className="w-5 h-5" /></div>
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {posts.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No posts yet. Be the first to share something!
          </div>
        )}
      </div>
    </div>
  )
}
