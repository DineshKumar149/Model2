'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { Send, Phone, Video, Info } from 'lucide-react'

export default function MessagesPage() {
  const { user } = useUserStore()
  const supabase = createClient()
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    fetchMessages()
    
    // Supabase Realtime Subscription
    const channel = supabase
      .channel('messages_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*, profiles(*)').order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return
    // Assuming a global chat for demo purposes if chat_id isn't dynamically set
    await supabase.from('messages').insert({
      sender_id: user.id,
      content: newMessage,
      chat_id: '00000000-0000-0000-0000-000000000000' // Placeholder
    })
    setNewMessage('')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Chats</h2>
          <input 
            type="text" 
            placeholder="Search messages..." 
            className="w-full mt-4 bg-secondary rounded-lg px-4 py-2 outline-none text-sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Chat List Items */}
          <div className="p-4 flex items-center gap-3 hover:bg-secondary cursor-pointer transition-colors border-b">
            <div className="w-12 h-12 rounded-full bg-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold truncate">Global Community Chat</h4>
              <p className="text-sm text-muted-foreground truncate">Welcome to the platform!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="h-16 border-b flex items-center justify-between px-6 bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500" />
            <h3 className="font-bold">Global Community Chat</h3>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <Phone className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" />
            <Video className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" />
            <Info className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === user?.id
            return (
              <div key={i} className={`flex max-w-[70%] ${isMe ? 'ml-auto' : 'mr-auto'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-secondary mr-2 shrink-0 overflow-hidden">
                    {msg.profiles?.avatar_url && <img src={msg.profiles.avatar_url} className="w-full h-full object-cover" />}
                  </div>
                )}
                <div className={`p-4 rounded-2xl ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary rounded-tl-sm'}`}>
                  {!isMe && <p className="text-xs font-bold mb-1 opacity-70">{msg.profiles?.display_name}</p>}
                  <p className="text-[15px] leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t bg-card">
          <div className="flex items-center gap-2 bg-secondary rounded-full p-2 pr-4">
            <input 
              type="text" 
              className="flex-1 bg-transparent px-4 outline-none text-[15px]" 
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="p-2 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform">
              <Send className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
