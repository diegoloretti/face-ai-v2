import { describe, it, expect } from 'vitest'
import { verifyMock } from './api'
import type { ClientFeatures } from '@face-ai/shared'

const baseFeatures: ClientFeatures = {
  age: 35,
  antiSpoofScore: 0.95,
  livenessScore: 0.95,
  faceDetectionScore: 0.99,
}

const sessionId = '00000000-0000-4000-8000-000000000000'
const local = 'demo'

describe('verifyMock', () => {
  it('retorna decisão "aprovado" para idade >= 22 com scores altos', async () => {
    const res = await verifyMock(baseFeatures, sessionId, local)
    expect(res.decisao).toBe('aprovado')
    expect(res.faixa_etaria).toBe('22+')
    expect(res.jwt).toMatch(/^mock-jwt-/)
    expect(res.motivo).toBeNull()
    expect(res.tamper_detected).toBe(false)
  })

  it('retorna "requer_declaracao" para idade na faixa 16-21', async () => {
    const res = await verifyMock({ ...baseFeatures, age: 18 }, sessionId, local)
    expect(res.decisao).toBe('requer_declaracao')
    expect(res.faixa_etaria).toBe('16-21')
  })

  it('retorna "recusado" para idade < 13', async () => {
    const res = await verifyMock({ ...baseFeatures, age: 10 }, sessionId, local)
    expect(res.decisao).toBe('recusado')
    expect(res.faixa_etaria).toBe('<13')
    expect(res.motivo).toBe('faixa_etaria_minor')
  })

  it('retorna "recusado" com motivo liveness_fail para liveness baixo', async () => {
    const res = await verifyMock({ ...baseFeatures, livenessScore: 0.3 }, sessionId, local)
    expect(res.decisao).toBe('recusado')
    expect(res.motivo).toBe('liveness_fail')
  })

  it('retorna "recusado" com motivo antispoof_fail para antiSpoofScore baixo', async () => {
    const res = await verifyMock({ ...baseFeatures, antiSpoofScore: 0.3 }, sessionId, local)
    expect(res.decisao).toBe('recusado')
    expect(res.motivo).toBe('antispoof_fail')
  })

  it('faixa 13-15 recebe recusa hard sem declaração', async () => {
    const res = await verifyMock({ ...baseFeatures, age: 14 }, sessionId, local)
    expect(res.decisao).toBe('recusado')
    expect(res.faixa_etaria).toBe('13-15')
    expect(res.motivo).toBe('faixa_etaria_minor')
  })

  it('jwt mockado inclui sessionId pra rastreabilidade', async () => {
    const res = await verifyMock(baseFeatures, sessionId, local)
    expect(res.jwt).toContain(sessionId)
  })
})

describe('cannedVerifyResponse', () => {
  it('retorna aprovado/22+ para override aprovado', async () => {
    const { cannedVerifyResponse } = await import('./api')
    const r = cannedVerifyResponse('aprovado', sessionId)
    expect(r.decisao).toBe('aprovado')
    expect(r.faixa_etaria).toBe('22+')
  })

  it('retorna requer_declaracao/16-21 para override requer_declaracao', async () => {
    const { cannedVerifyResponse } = await import('./api')
    const r = cannedVerifyResponse('requer_declaracao', sessionId)
    expect(r.decisao).toBe('requer_declaracao')
    expect(r.faixa_etaria).toBe('16-21')
  })

  it('retorna recusado/13-15 com motivo faixa_etaria_minor para override recusado', async () => {
    const { cannedVerifyResponse } = await import('./api')
    const r = cannedVerifyResponse('recusado', sessionId)
    expect(r.decisao).toBe('recusado')
    expect(r.faixa_etaria).toBe('13-15')
    expect(r.motivo).toBe('faixa_etaria_minor')
  })
})
