import { describe, it, expect } from 'vitest'
import { computeDepartement } from '../engine/merge.js'

describe('computeDepartement', () => {
  it('extracts the first 2 digits of a valid postal code', () => {
    expect(computeDepartement('10130')).toBe('10')
    expect(computeDepartement('54122')).toBe('54')
  })

  it('returns N/D for a non-numeric placeholder postal code', () => {
    expect(computeDepartement('CPXXXXX')).toBe('N/D')
  })

  it('returns N/D for an empty postal code', () => {
    expect(computeDepartement('')).toBe('N/D')
    expect(computeDepartement(undefined)).toBe('N/D')
  })

  it('trims whitespace before evaluating', () => {
    expect(computeDepartement('  10130  ')).toBe('10')
  })
})
