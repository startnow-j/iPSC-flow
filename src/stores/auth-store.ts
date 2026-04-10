import { create } from 'zustand'

export interface UserInfo {
  id: string
  name: string
  email: string
  role: string
  department: string | null
}

interface AuthState {
  user: UserInfo | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: UserInfo | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}))
