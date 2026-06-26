import { describe, it, expect } from 'vitest'
import {
  binaryDistribution,
  statsFilterOptions,
  applyStatsFilters,
  NO_FEDERATION,
  NO_AGC,
} from '../engine/stats.js'

const rows = [
  { departement: '10', federation: 'F1', nom_federation: 'Féd Un', agc: 'A1', nom_agc: 'Agc Un', annuaire: 'Oui', plateforme: 'Non', adresse_active: 'Oui' },
  { departement: '52', federation: 'F2', nom_federation: 'Féd Deux', agc: 'A1', nom_agc: 'Agc Un', annuaire: 'Non', plateforme: 'Oui', adresse_active: '' },
  { departement: '10', federation: 'F1', nom_federation: 'Féd Un', agc: '', nom_agc: '', annuaire: '', plateforme: 'Oui', adresse_active: 'Non' },
  { departement: 'N/D', federation: '', nom_federation: '', agc: 'A2', nom_agc: 'Agc Deux', annuaire: 'Oui', plateforme: '', adresse_active: 'Oui' },
]

describe('binaryDistribution', () => {
  it('counts Oui versus everything else (Non + empty) over the total', () => {
    const result = binaryDistribution(rows, 'annuaire')
    expect(result).toEqual({ oui: 2, reste: 2, total: 4 })
  })

  it('treats empty string as part of reste, not oui', () => {
    const result = binaryDistribution(rows, 'adresse_active')
    // Oui on rows 0 and 3, Non on row 2, empty on row 1 → oui=2, reste=2
    expect(result).toEqual({ oui: 2, reste: 2, total: 4 })
  })

  it('returns zeros for an empty row set', () => {
    expect(binaryDistribution([], 'annuaire')).toEqual({ oui: 0, reste: 0, total: 0 })
  })
})

describe('statsFilterOptions', () => {
  it('lists unique departments sorted', () => {
    const { departements } = statsFilterOptions(rows)
    expect(departements).toEqual(['10', '52', 'N/D'])
  })

  it('lists unique federation codes with their name, sorted by code', () => {
    const { federations } = statsFilterOptions(rows)
    expect(federations).toEqual([
      { code: 'F1', nom: 'Féd Un' },
      { code: 'F2', nom: 'Féd Deux' },
    ])
  })

  it('lists unique agc codes with their name, ignoring empty codes', () => {
    const { agcs } = statsFilterOptions(rows)
    expect(agcs).toEqual([
      { code: 'A1', nom: 'Agc Un' },
      { code: 'A2', nom: 'Agc Deux' },
    ])
  })
})

describe('applyStatsFilters', () => {
  it('returns all rows when no filter is active', () => {
    const result = applyStatsFilters(rows, { departements: [], federations: [], agcs: [] })
    expect(result).toHaveLength(4)
  })

  it('keeps rows whose department is in the selection (OR within dimension)', () => {
    const result = applyStatsFilters(rows, { departements: ['10', 'N/D'], federations: [], agcs: [] })
    expect(result.map(r => r.departement)).toEqual(['10', '10', 'N/D'])
  })

  it('matches rows without a federation via the NO_FEDERATION sentinel', () => {
    const result = applyStatsFilters(rows, { departements: [], federations: [NO_FEDERATION], agcs: [] })
    expect(result.map(r => r.departement)).toEqual(['N/D'])
  })

  it('combines a real code and the sentinel inside one dimension (OR)', () => {
    const result = applyStatsFilters(rows, { departements: [], federations: ['F2', NO_FEDERATION], agcs: [] })
    expect(result.map(r => r.departement)).toEqual(['52', 'N/D'])
  })

  it('matches rows without an agc via the NO_AGC sentinel', () => {
    const result = applyStatsFilters(rows, { departements: [], federations: [], agcs: [NO_AGC] })
    expect(result).toHaveLength(1)
    expect(result[0].departement).toBe('10')
  })

  it('combines dimensions with AND', () => {
    const result = applyStatsFilters(rows, { departements: ['10'], federations: ['F1'], agcs: ['A1'] })
    // dept 10 ∧ féd F1 ∧ agc A1 → only the first row
    expect(result).toHaveLength(1)
    expect(result[0].agc).toBe('A1')
  })

  it('returns empty when AND dimensions do not intersect', () => {
    const result = applyStatsFilters(rows, { departements: ['52'], federations: ['F1'], agcs: [] })
    expect(result).toHaveLength(0)
  })
})
