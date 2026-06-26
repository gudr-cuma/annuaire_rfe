import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultsTable } from '../components/consultation/ResultsTable.jsx'
import useAuthStore from '../store/useAuthStore.js'

vi.mock('../store/useDataStore.js', () => ({
  default: (selector) => selector({
    sortKey: '', sortDir: 'asc', setSort: () => {},
    excludeDossier: () => {}, updateRowStatus: () => {},
  }),
}))

vi.mock('../store/useImportAuthStore.js', () => ({
  default: (selector) => selector({ authenticated: false }),
}))

vi.mock('../store/useAuthStore.js', () => ({
  default: vi.fn(),
}))

const rows = [
  {
    dossier: 'D1', siren: '1', nom: 'Test SAS', annuaire: 0, plateforme: 0,
    adresse_active: 0, departement: '35', cpostal: '35000', ville: 'Rennes',
    agc: 'A01', nom_agc: 'AGC Bretagne', federation: 'F01', nom_federation: 'Fédé Test',
    un_gesdosno: '', adresse_facturation: '',
  },
]

describe('ResultsTable — visibilité colonnes référentiels', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('masque les colonnes AGC, Nom AGC, Fédération, Nom Fédération pour un visiteur non connecté', () => {
    useAuthStore.mockImplementation(selector => selector({ user: null, departments: [] }))
    render(<ResultsTable rows={rows} />)
    expect(screen.queryByRole('columnheader', { name: /^AGC$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^Nom AGC$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^Fédération$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^Nom Fédération$/i })).not.toBeInTheDocument()
  })

  it('affiche les colonnes AGC, Nom AGC, Fédération, Nom Fédération pour un utilisateur connecté', () => {
    useAuthStore.mockImplementation(selector => selector({ user: { id: 1, role: 'user' }, departments: ['35'] }))
    render(<ResultsTable rows={rows} />)
    expect(screen.getByRole('columnheader', { name: /^AGC$/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Nom AGC$/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Fédération$/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Nom Fédération$/i })).toBeInTheDocument()
  })
})
