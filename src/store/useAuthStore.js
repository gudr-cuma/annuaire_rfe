import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  departments: [],
  isLoading: false,
  error: '',
  initialized: false,

  async init() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
      if (!res.ok) {
        set({ user: null, departments: [], initialized: true })
        return
      }
      const data = await res.json()
      set({ user: data.user, departments: data.departments, initialized: true })
    } catch {
      set({ user: null, departments: [], initialized: true })
    }
  },

  async login(email, password) {
    set({ isLoading: true, error: '' })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        set({ isLoading: false, error: data.error || 'Identifiants invalides.' })
        return false
      }
      const meRes = await fetch('/api/auth/me', { credentials: 'same-origin' })
      const meData = await meRes.json()
      set({ user: meData.user, departments: meData.departments, isLoading: false, error: '' })
      // Reload dossiers data to include status columns
      const { default: useDataStore } = await import('./useDataStore.js')
      await useDataStore.getState().loadData()
      return true
    } catch {
      set({ isLoading: false, error: 'Erreur réseau, réessayez.' })
      return false
    }
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } catch {}
    set({ user: null, departments: [] })
    // Reload dossiers without status columns
    const { default: useDataStore } = await import('./useDataStore.js')
    useDataStore.getState().loadData()
  },
}))

export default useAuthStore
