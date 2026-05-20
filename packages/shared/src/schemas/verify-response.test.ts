import { describe, it, expect } from 'vitest'
import { VerifyResponseSchema } from './verify-response'

describe('VerifyResponseSchema', () => {
  it('aceita payload válido com decisão aprovado', () => {
    const payload = {
      decisao: 'aprovado',
      faixa_etaria: '22+',
      jwt: 'mock-jwt',
      motivo: null,
      tamper_detected: false
    }
    expect(() => VerifyResponseSchema.parse(payload)).not.toThrow()
  })

  it('rejeita decisão fora do enum', () => {
    const payload = {
      decisao: 'meio_aprovado',
      faixa_etaria: '22+',
      jwt: 'mock-jwt',
      motivo: null,
      tamper_detected: false
    }
    expect(() => VerifyResponseSchema.parse(payload)).toThrow()
  })

  it('rejeita jwt vazio', () => {
    const payload = {
      decisao: 'aprovado',
      faixa_etaria: '22+',
      jwt: '',
      motivo: null,
      tamper_detected: false
    }
    expect(() => VerifyResponseSchema.parse(payload)).toThrow()
  })

  it('aceita motivo string quando recusado', () => {
    const payload = {
      decisao: 'recusado',
      faixa_etaria: '<13',
      jwt: 'mock-jwt',
      motivo: 'faixa_etaria_minor',
      tamper_detected: false
    }
    expect(() => VerifyResponseSchema.parse(payload)).not.toThrow()
  })
})
