import { create } from 'zustand'

const useDataStore = create((set, get) => ({
  rawRows: [],
  meta: null,
  isLoading: false,
  loadError: null,

  search: '',
  colFilters: {},
  group: ['', '', ''],
  sortKey: 'nom',
  sortDir: 'asc',
  expandedGroups: new Set(),
  filtersVersion: 0,

  async loadData() {
    set({ isLoading: true, loadError: null })
    try {
      const [dossiersRes, metaRes] = await Promise.all([
        fetch('/api/dossiers'),
        fetch('/api/meta'),
      ])
      if (!dossiersRes.ok) throw new Error(`Erreur ${dossiersRes.status} lors du chargement des données`)
      const dossiersData = await dossiersRes.json()
      const metaData = metaRes.ok ? await metaRes.json() : null
      set({ rawRows: dossiersData.rows || [], meta: metaData, isLoading: false })
    } catch (err) {
      set({ loadError: err.message, isLoading: false })
    }
  },

  setSearch(value) {
    set({ search: value })
  },

  setColFilter(key, value) {
    set(state => ({ colFilters: { ...state.colFilters, [key]: value } }))
  },

  setGroupLevel(idx, value) {
    set(state => {
      const group = state.group.slice()
      group[idx] = value
      return { group, expandedGroups: new Set() }
    })
  },

  setSort(key) {
    set(state => {
      if (state.sortKey === key) return { sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' }
      return { sortKey: key, sortDir: 'asc' }
    })
  },

  toggleGroup(id) {
    set(state => {
      const next = new Set(state.expandedGroups)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { expandedGroups: next }
    })
  },

  setAllGroupsExpanded(ids, expanded) {
    set({ expandedGroups: expanded ? new Set(ids) : new Set() })
  },

  resetFilters() {
    set(state => ({ search: '', colFilters: {}, filtersVersion: state.filtersVersion + 1 }))
  },

  async excludeDossier(dossierCode) {
    const res = await fetch('/api/exclusions', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier_code: dossierCode }),
    })
    if (res.ok) {
      set(state => ({ rawRows: state.rawRows.filter(r => r.dossier !== dossierCode) }))
    }
    return res.ok
  },

  async reincludeDossier(dossierCode) {
    const res = await fetch('/api/exclusions/remove', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier_code: dossierCode }),
    })
    if (res.ok) {
      await get().loadData()
    }
    return res.ok
  },
}))

export default useDataStore
