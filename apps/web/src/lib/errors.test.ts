import { describe, it, expect } from 'vitest'
import { mapErrorToMessage, ERROR_MAP } from './errors'

describe('ERROR_MAP', () => {
  it('mapeia códigos de câmera para mensagens em PT-BR', () => {
    expect(ERROR_MAP.NotAllowedError).toMatch(/permissão.*câmera/i)
    expect(ERROR_MAP.NotFoundError).toMatch(/câmera.*não encontrada/i)
  })

  it('mapeia códigos de liveness para mensagens em PT-BR', () => {
    expect(ERROR_MAP.LIVENESS_FAIL).toMatch(/presença/i)
    expect(ERROR_MAP.ANTISPOOF_FAIL).toMatch(/foto.*tela/i)
  })

  it('tem código UNKNOWN como fallback', () => {
    expect(ERROR_MAP.UNKNOWN).toBeTruthy()
  })
})

describe('mapErrorToMessage', () => {
  it('mapeia erro com .name conhecido', () => {
    const err = new Error('boom')
    err.name = 'NotAllowedError'
    expect(mapErrorToMessage(err)).toBe(ERROR_MAP.NotAllowedError)
  })

  it('mapeia código string conhecido', () => {
    expect(mapErrorToMessage('LIVENESS_FAIL')).toBe(ERROR_MAP.LIVENESS_FAIL)
  })

  it('retorna mensagem UNKNOWN se código desconhecido', () => {
    expect(mapErrorToMessage('xyz_inexistente')).toBe(ERROR_MAP.UNKNOWN)
  })

  it('retorna mensagem UNKNOWN se receber null/undefined', () => {
    expect(mapErrorToMessage(null)).toBe(ERROR_MAP.UNKNOWN)
    expect(mapErrorToMessage(undefined)).toBe(ERROR_MAP.UNKNOWN)
  })
})
