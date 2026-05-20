import { describe, it, expect } from 'vitest'
import { classifyAge } from './ageClassifier'

describe('classifyAge', () => {
  it('retorna "<13" para idade menor que 13', () => {
    expect(classifyAge(5)).toBe('<13')
    expect(classifyAge(12)).toBe('<13')
    expect(classifyAge(12.9)).toBe('<13')
  })

  it('retorna "13-15" para idade entre 13 e 15 inclusive', () => {
    expect(classifyAge(13)).toBe('13-15')
    expect(classifyAge(14)).toBe('13-15')
    expect(classifyAge(15.9)).toBe('13-15')
  })

  it('retorna "16-21" para idade entre 16 e 21 inclusive', () => {
    expect(classifyAge(16)).toBe('16-21')
    expect(classifyAge(20)).toBe('16-21')
    expect(classifyAge(21.5)).toBe('16-21')
  })

  it('retorna "22+" para idade maior ou igual a 22', () => {
    expect(classifyAge(22)).toBe('22+')
    expect(classifyAge(35)).toBe('22+')
    expect(classifyAge(120)).toBe('22+')
  })

  it('aceita float e trata limites corretamente', () => {
    expect(classifyAge(12.999)).toBe('<13')
    expect(classifyAge(21.999)).toBe('16-21')
  })
})
