import { describe, it, expect } from 'vitest'
import { sessionReducer, initialSessionState } from './useSession'
import type { VerifyResponse } from '@face-ai/shared'

const aprovado: VerifyResponse = {
  decisao: 'aprovado',
  faixa_etaria: '22+',
  jwt: 'mock-jwt-xyz',
  motivo: null,
  tamper_detected: false
}

const requerDeclaracao: VerifyResponse = {
  decisao: 'requer_declaracao',
  faixa_etaria: '16-21',
  jwt: 'mock-jwt-abc',
  motivo: null,
  tamper_detected: false
}

describe('sessionReducer', () => {
  it('estado inicial tem screen = consent', () => {
    expect(initialSessionState().screen).toBe('consent')
  })

  it('transição CONSENT_ACCEPTED leva para instructions', () => {
    const next = sessionReducer(initialSessionState(), { type: 'CONSENT_ACCEPTED' })
    expect(next.screen).toBe('instructions')
  })

  it('transição CONSENT_REJECTED leva para thankyou', () => {
    const next = sessionReducer(initialSessionState(), { type: 'CONSENT_REJECTED' })
    expect(next.screen).toBe('thankyou')
  })

  it('transição VIEW_PRIVACY leva para privacy', () => {
    const next = sessionReducer(initialSessionState(), { type: 'VIEW_PRIVACY' })
    expect(next.screen).toBe('privacy')
  })

  it('transição PRIVACY_BACK volta para consent', () => {
    const s = sessionReducer(initialSessionState(), { type: 'VIEW_PRIVACY' })
    const next = sessionReducer(s, { type: 'PRIVACY_BACK' })
    expect(next.screen).toBe('consent')
  })

  it('transição INSTRUCTIONS_PROCEED leva para camera', () => {
    const s = { ...initialSessionState(), screen: 'instructions' as const }
    const next = sessionReducer(s, { type: 'INSTRUCTIONS_PROCEED' })
    expect(next.screen).toBe('camera')
  })

  it('VERIFY_RESPONSE aprovado leva para result e armazena response', () => {
    const s = { ...initialSessionState(), screen: 'camera' as const }
    const next = sessionReducer(s, { type: 'VERIFY_RESPONSE', response: aprovado })
    expect(next.screen).toBe('result')
    expect(next.verifyResponse).toEqual(aprovado)
  })

  it('VERIFY_RESPONSE requer_declaracao leva para declaration', () => {
    const s = { ...initialSessionState(), screen: 'camera' as const }
    const next = sessionReducer(s, {
      type: 'VERIFY_RESPONSE',
      response: requerDeclaracao
    })
    expect(next.screen).toBe('declaration')
    expect(next.verifyResponse).toEqual(requerDeclaracao)
  })

  it('DECLARATION_CONFIRMED armazena a declaração e vai para result', () => {
    const s = {
      ...initialSessionState(),
      screen: 'declaration' as const,
      verifyResponse: requerDeclaracao
    }
    const declResponse = {
      decisao: 'aprovado_com_declaracao' as const,
      jwt: 'mock-jwt-decl-xyz',
      timestamp_declaracao: '2026-05-20T12:34:56.000Z'
    }
    const next = sessionReducer(s, { type: 'DECLARATION_CONFIRMED', response: declResponse })
    expect(next.screen).toBe('result')
    expect(next.declarationResponse).toEqual(declResponse)
  })

  it('DECLARATION_REFUSED vai para thankyou', () => {
    const s = { ...initialSessionState(), screen: 'declaration' as const }
    const next = sessionReducer(s, { type: 'DECLARATION_REFUSED' })
    expect(next.screen).toBe('thankyou')
  })

  it('RETRY volta para camera limpando verifyResponse e declarationResponse', () => {
    const declResponse = {
      decisao: 'aprovado_com_declaracao' as const,
      jwt: 'mock-jwt-decl-xyz',
      timestamp_declaracao: '2026-05-20T12:34:56.000Z'
    }
    const s = {
      ...initialSessionState(),
      screen: 'result' as const,
      verifyResponse: aprovado,
      declarationResponse: declResponse
    }
    const next = sessionReducer(s, { type: 'RETRY' })
    expect(next.screen).toBe('camera')
    expect(next.verifyResponse).toBeNull()
    expect(next.declarationResponse).toBeNull()
  })

  it('sessionId é um UUID v4', () => {
    const s = initialSessionState()
    expect(s.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })
})
