import { describe, it, expect } from 'vitest'
import { HttpError, isHttpError } from './errors.js'

describe('HttpError', () => {
  it('captura status, code e detalhe', () => {
    const e = new HttpError(422, 'no_face', { hint: 'centralize' })
    expect(e.status).toBe(422)
    expect(e.code).toBe('no_face')
    expect(e.detail).toEqual({ hint: 'centralize' })
    expect(e.message).toBe('no_face')
  })

  it('detail é opcional', () => {
    const e = new HttpError(429, 'rate_limit')
    expect(e.detail).toBeUndefined()
  })
})

describe('isHttpError', () => {
  it('identifica instâncias', () => {
    expect(isHttpError(new HttpError(400, 'invalid_payload'))).toBe(true)
  })

  it('rejeita não-HttpError', () => {
    expect(isHttpError(new Error('boom'))).toBe(false)
    expect(isHttpError(null)).toBe(false)
    expect(isHttpError({ status: 400 })).toBe(false)
  })
})
