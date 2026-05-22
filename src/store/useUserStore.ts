import { create } from 'zustand'
import { Profile } from '@/types'

interface UserState {
  user: any | null
  profile: Profile | null
  setUser: (user: any | null) => void
  setProfile: (profile: Profile | null) => void
  clearAuth: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  clearAuth: () => set({ user: null, profile: null }),
}))
