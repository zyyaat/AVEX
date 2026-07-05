'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { merchantAuthAPI, setAuthToken } from '@/lib/api'

interface AuthState {
  token: string | null
  merchant: any
  isAuthenticated: boolean
  isLoading: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => void
  initialize: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null, merchant: null, isAuthenticated: false, isLoading: false,
      login: async (phone, password) => {
        set({ isLoading: true })
        try {
          const { token, merchant } = await merchantAuthAPI.login({ phone, password })
          setAuthToken(token)
          set({ token, merchant, isAuthenticated: true, isLoading: false })
        } catch (e) { set({ isLoading: false }); throw e }
      },
      logout: () => { setAuthToken(null); set({ token: null, merchant: null, isAuthenticated: false }) },
      initialize: async () => {
        const token = get().token
        if (token) {
          setAuthToken(token)
          try { const m = await merchantAuthAPI.me(); set({ merchant: m, isAuthenticated: true }) }
          catch { setAuthToken(null); set({ token: null, isAuthenticated: false }) }
        }
      },
    }),
    { name: 'avex-merchant-auth', partialize: (s) => ({ token: s.token, merchant: s.merchant, isAuthenticated: s.isAuthenticated }) }
  )
)
