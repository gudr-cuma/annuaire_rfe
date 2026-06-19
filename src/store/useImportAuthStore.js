import { create } from 'zustand'

const useImportAuthStore = create((set) => ({
  authenticated: false,
  isLoading: false,
  authError: '',
  statusChecked: false,

  async init() {
    try {
      const res = await fetch('/api/import/status', { credentials: 'same-origin' })
      const data = res.ok ? await res.json() : { authenticated: false }
      set({ authenticated: !!data.authenticated, statusChecked: true })
    } catch {
      set({ authenticated: false, statusChecked: true })
    }
  },

  async login(secret) {
    set({ isLoading: true, authError: '' })
    try {
      const res = await fetch('/api/import/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ secret }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        set({ isLoading: false, authError: data.error || 'Secret invalide.' })
        return
      }
      set({ authenticated: true, isLoading: false, authError: '' })
    } catch {
      set({ isLoading: false, authError: 'Erreur réseau, réessayez.' })
    }
  },

  logout() {
    set({ authenticated: false })
  },
}))

export default useImportAuthStore
