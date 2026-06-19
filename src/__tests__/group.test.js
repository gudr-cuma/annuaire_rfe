import { describe, it, expect } from 'vitest'
import { buildGroupTree, collectGroupIds } from '../engine/group.js'

const rows = [
  { nom: 'B', agc: 'AGC1', federation: 'F1' },
  { nom: 'A', agc: 'AGC1', federation: 'F1' },
  { nom: 'C', agc: 'AGC2', federation: 'F1' },
  { nom: 'D', agc: '', federation: 'F2' },
]

describe('buildGroupTree', () => {
  it('returns a leaf with sorted rows when no grouping levels', () => {
    const tree = buildGroupTree(rows, [], 'nom', 'asc')
    expect(tree.type).toBe('leaf')
    expect(tree.rows.map(r => r.nom)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('groups by one level with counts, N/D group last', () => {
    const tree = buildGroupTree(rows, ['agc'], 'nom', 'asc')
    expect(tree.type).toBe('node')
    expect(tree.groups.map(g => g.value)).toEqual(['AGC1', 'AGC2', 'N/D'])
    expect(tree.groups[0].count).toBe(2)
    expect(tree.groups[0].children.rows.map(r => r.nom)).toEqual(['A', 'B'])
  })

  it('groups recursively on 2 levels', () => {
    const tree = buildGroupTree(rows, ['federation', 'agc'], 'nom', 'asc')
    const f1 = tree.groups.find(g => g.value === 'F1')
    expect(f1.children.type).toBe('node')
    expect(f1.children.groups.map(g => g.value)).toEqual(['AGC1', 'AGC2'])
  })
})

describe('collectGroupIds', () => {
  it('collects ids for every node at every level', () => {
    const tree = buildGroupTree(rows, ['federation', 'agc'], 'nom', 'asc')
    const ids = collectGroupIds(tree)
    expect(ids).toContain('federation:F1')
    expect(ids).toContain('federation:F1>agc:AGC1')
    expect(ids).toContain('federation:F2')
  })
})
