import { describe, it, expect } from 'vitest'
import { applyFilters, sortRows } from '../engine/filterSort.js'
import { EMPTY_FILTER } from '../engine/columns.js'

const rows = [
  { siren: '1', nom: 'MONTFEY SARL', departement: '10', cpostal: '10130', ville: 'Montfey', agc: 'A', federation: 'F1', un_gesdosno: '', dossier: 'D1', annuaire: 'Oui', plateforme: 'Non', adresse_facturation: '', adresse_active: '' },
  { siren: '2', nom: 'Dupont', departement: '52', cpostal: '52000', ville: 'Chaumont', agc: 'B', federation: 'F2', un_gesdosno: '', dossier: 'D2', annuaire: 'Non', plateforme: 'Non', adresse_facturation: '', adresse_active: 'Oui' },
  { siren: '3', nom: 'Autre', departement: 'N/D', cpostal: '', ville: '', agc: '', federation: 'F1', un_gesdosno: '', dossier: 'D3', annuaire: '', plateforme: '', adresse_facturation: '', adresse_active: '' },
]

describe('applyFilters', () => {
  it('global search is accent and case insensitive', () => {
    const result = applyFilters(rows, { search: 'montfey', colFilters: {} })
    expect(result.map(r => r.siren)).toEqual(['1'])
  })

  it('matches accented search term against unaccented data and vice versa', () => {
    const result = applyFilters(rows, { search: 'montfe', colFilters: {} })
    expect(result.map(r => r.siren)).toEqual(['1'])
  })

  it('filters by column substring match', () => {
    const result = applyFilters(rows, { search: '', colFilters: { federation: 'F1' } })
    expect(result.map(r => r.siren)).toEqual(['1', '3'])
  })

  it('__EMPTY__ sentinel returns only rows with falsy value', () => {
    const result = applyFilters(rows, { search: '', colFilters: { annuaire: EMPTY_FILTER } })
    expect(result.map(r => r.siren)).toEqual(['3'])
  })

  it('combines global search and column filters with AND logic', () => {
    const result = applyFilters(rows, { search: 'f1', colFilters: { siren: '1' } })
    expect(result.map(r => r.siren)).toEqual(['1'])
  })
})

describe('sortRows', () => {
  it('sorts ascending using French locale numeric comparison', () => {
    const data = [{ cpostal: '10130' }, { cpostal: '2000' }, { cpostal: '52000' }]
    const result = sortRows(data, 'cpostal', 'asc')
    expect(result.map(r => r.cpostal)).toEqual(['2000', '10130', '52000'])
  })

  it('sorts descending when requested', () => {
    const result = sortRows(rows, 'nom', 'desc')
    expect(result.map(r => r.siren)).toEqual(['1', '2', '3'])
  })
})
