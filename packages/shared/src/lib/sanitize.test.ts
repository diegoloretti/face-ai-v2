import { describe, it, expect } from 'vitest'
import { sanitizeLocal } from './sanitize'

describe('sanitizeLocal', () => {
  it('retorna "desconhecido" pra null', () => {
    expect(sanitizeLocal(null)).toBe('desconhecido')
  })

  it('retorna "desconhecido" pra string vazia', () => {
    expect(sanitizeLocal('')).toBe('desconhecido')
  })

  it('preserva alfanuméricos, hífen e underscore', () => {
    expect(sanitizeLocal('loja_centro-01')).toBe('loja_centro-01')
  })

  it('remove caracteres especiais', () => {
    expect(sanitizeLocal('loja!@#$%^&*()centro')).toBe('lojacentro')
  })

  it('remove espaços', () => {
    expect(sanitizeLocal('loja centro')).toBe('lojacentro')
  })

  it('trunca em 50 caracteres antes de filtrar', () => {
    const input = 'a'.repeat(60) + '!!!!'
    const result = sanitizeLocal(input)
    expect(result).toBe('a'.repeat(50))
    expect(result.length).toBe(50)
  })

  it('lida com unicode removendo (não é alfanumérico ASCII)', () => {
    expect(sanitizeLocal('loja-são-paulo')).toBe('loja-so-paulo')
  })
})
