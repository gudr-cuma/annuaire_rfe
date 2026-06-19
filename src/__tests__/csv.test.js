import { describe, it, expect } from 'vitest'
import { detectDelimiter, parseCSV } from '../engine/csv.js'

describe('detectDelimiter', () => {
  it('favors semicolon when more semicolons than commas', () => {
    expect(detectDelimiter('SIREN;NOM;CPOSTAL')).toBe(';')
  })
  it('favors comma when more commas than semicolons', () => {
    expect(detectDelimiter('SIREN,NOM,CPOSTAL')).toBe(',')
  })
  it('favors semicolon on a tie', () => {
    expect(detectDelimiter('A;B,C')).toBe(';')
  })
})

describe('parseCSV', () => {
  it('parses simple semicolon rows and trims fields', () => {
    const { headers, rows } = parseCSV('SIREN;NOM\n123456789; Acme Corp ', ';')
    expect(headers).toEqual(['SIREN', 'NOM'])
    expect(rows).toEqual([['123456789', 'Acme Corp']])
  })

  it('handles quoted fields with escaped quotes', () => {
    const { rows } = parseCSV('SIREN;NOM\n123;"Acme ""The Best"" Corp"', ';')
    expect(rows[0]).toEqual(['123', 'Acme "The Best" Corp'])
  })

  it('strips a leading BOM', () => {
    const { headers } = parseCSV('﻿SIREN;NOM\n1;2', ';')
    expect(headers[0]).toBe('SIREN')
  })

  it('ignores empty lines', () => {
    const { rows } = parseCSV('SIREN;NOM\n1;2\n\n3;4', ';')
    expect(rows).toHaveLength(2)
  })

  it('handles a field containing the alternate delimiter', () => {
    const { rows } = parseCSV('A,B\n"x;y",z', ',')
    expect(rows[0]).toEqual(['x;y', 'z'])
  })
})
