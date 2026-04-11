import { create } from 'zustand'

export interface ProductRoleAssignment {
  productId: string
  productCode: string
  productName: string
  productLine: string
  roles: string[]
}

export interface UserInfo {
  id: string
  name: string
  email: string
  role: string       // 主角色
  roles: string[]   // 所有角色
  department: string | null
  productRoles: ProductRoleAssignment[]
}

interface AuthState {
  user: UserInfo | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: UserInfo | null, token?: string | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  getToken: () => string | null
}

const TOKEN_KEY = 'ipsc_auth_token'

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user, token) => {
    const t = token ?? get().token
    if (user && t) {
      // Persist token in localStorage for reliability
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, t)
      }
      set({ user, token: t, isAuthenticated: true, isLoading: false })
    } else {
      // Clear
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
      }
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
    }
  },

  setLoading: (isLoading) =>
    set({ isLoading }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  getToken: () => get().token,
}))
