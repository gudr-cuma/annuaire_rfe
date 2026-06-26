import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupingControls } from '../components/consultation/GroupingControls.jsx'
import useAuthStore from '../store/useAuthStore.js'

vi.mock('../store/useDataStore.js', () => ({
  default: (selector) => selector({
    group: ['', '', ''],
    setGroupLevel: () => {},
    setAllGroupsExpanded: () => {},
  }),
}))

vi.mock('../store/useAuthStore.js', () => ({
  default: vi.fn(),
}))

describe('GroupingControls — options de regroupement', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('masque les options AGC et Fédération pour un visiteur non connecté', () => {
    useAuthStore.mockImplementation(selector => selector({ user: null }))
    render(<GroupingControls allGroupIds={[]} />)
    expect(screen.queryAllByRole('option', { name: /^Niveau \d+ : AGC$/ })).toHaveLength(0)
    expect(screen.queryAllByRole('option', { name: /^Niveau \d+ : Fédération$/ })).toHaveLength(0)
  })

  it('affiche les options AGC et Fédération pour un utilisateur connecté', () => {
    useAuthStore.mockImplementation(selector => selector({ user: { id: 1 } }))
    render(<GroupingControls allGroupIds={[]} />)
    // 3 selects × 1 option AGC chacun = 3
    expect(screen.getAllByRole('option', { name: /^Niveau \d+ : AGC$/ })).toHaveLength(3)
    expect(screen.getAllByRole('option', { name: /^Niveau \d+ : Fédération$/ })).toHaveLength(3)
  })

  it('les options Aucun regroupement et Département sont toujours présentes', () => {
    useAuthStore.mockImplementation(selector => selector({ user: null }))
    render(<GroupingControls allGroupIds={[]} />)
    expect(screen.getAllByRole('option', { name: /Aucun regroupement/ })).toHaveLength(3)
    expect(screen.getAllByRole('option', { name: /Département/ })).toHaveLength(3)
  })
})
