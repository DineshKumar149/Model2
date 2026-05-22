'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, clearAuth, user } = useUserStore()
  const { setNotifications, addNotification } = useNotificationStore()
  const supabase = createClient()

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profile) setProfile(profile)

        // Load notifications
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*, profiles!actor_id(*), posts(*)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        if (notifs) setNotifications(notifs)

        // Update user presence to online
        try {
          await supabase.rpc('upsert_user_presence', {
            p_user_id: session.user.id,
            p_is_online: true,
          })
        } catch (err) {
          console.error('Failed to set online presence:', err)
        }
      } else {
        clearAuth()
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (profile) setProfile(profile)
        } else {
          clearAuth()
        }
      }
    )

    // Set offline on unload
    const handleUnload = () => {
      const userId = useUserStore.getState().user?.id
      if (userId) {
        supabase.rpc('upsert_user_presence', { p_user_id: userId, p_is_online: false }).then(() => {}, () => {})
      }
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])

  // Real-time notifications subscription
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`notif-provider:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('notifications')
          .select('*, profiles!actor_id(*), posts(*)')
          .eq('id', payload.new.id)
          .single()
        if (data) addNotification(data)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  return <>{children}</>
}
