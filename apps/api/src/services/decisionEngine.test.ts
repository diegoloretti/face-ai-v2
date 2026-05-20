import { describe, it, expect } from 'vitest'
import { decidir, LIVENESS_THRESHOLD, ANTISPOOF_THRESHOLD, detectTamper } from './decisionEngine.js'

function features(overrides: Partial<Parameters<typeof decidir>[0]> = {}) {
  return {
    age: 30,
    antiSpoofScore: 0.95,
    livenessScore: 0.9,
    faceDetectionScore: 0.99,
    ...overrides,
  }
}

describe('decidir', () => {
  it('aprova adulto com scores acima dos thresholds', () => {
    const r = decidir(features())
    expect(r.decisao).toBe('aprovado')
    expect(r.faixa_etaria).toBe('22+')
    expect(r.motivo).toBeNull()
  })

  it('recusa quando liveness abaixo do threshold', () => {
    const r = decidir(features({ livenessScore: LIVENESS_THRESHOLD - 0.01 }))
    expect(r.decisao).toBe('recusado')
    expect(r.motivo).toBe('liveness_fail')
  })

  it('recusa quando antispoof abaixo do threshold', () => {
    const r = decidir(features({ antiSpoofScore: ANTISPOOF_THRESHOLD - 0.01 }))
    expect(r.decisao).toBe('recusado')
    expect(r.motivo).toBe('antispoof_fail')
  })

  it('liveness fail tem precedência sobre antispoof fail', () => {
    const r = decidir(
      features({
        livenessScore: LIVENESS_THRESHOLD - 0.01,
        antiSpoofScore: ANTISPOOF_THRESHOLD - 0.01,
      }),
    )
    expect(r.motivo).toBe('liveness_fail')
  })

  it('pede declaração na faixa 16-21', () => {
    const r = decidir(features({ age: 18 }))
    expect(r.decisao).toBe('requer_declaracao')
    expect(r.faixa_etaria).toBe('16-21')
    expect(r.motivo).toBeNull()
  })

  it('recusa hard na faixa 13-15 (sem declaração)', () => {
    const r = decidir(features({ age: 14 }))
    expect(r.decisao).toBe('recusado')
    expect(r.faixa_etaria).toBe('13-15')
    expect(r.motivo).toBe('faixa_etaria_minor')
  })

  it('recusa hard na faixa <13', () => {
    const r = decidir(features({ age: 10 }))
    expect(r.decisao).toBe('recusado')
    expect(r.faixa_etaria).toBe('<13')
    expect(r.motivo).toBe('faixa_etaria_minor')
  })

  it('limite inferior faixa 22+ é 22 (inclusivo)', () => {
    expect(decidir(features({ age: 21.999 })).decisao).toBe('requer_declaracao')
    expect(decidir(features({ age: 22 })).decisao).toBe('aprovado')
  })
})

describe('detectTamper', () => {
  const base = {
    age: 30,
    antiSpoofScore: 0.9,
    livenessScore: 0.9,
    faceDetectionScore: 0.95,
  }

  it('sem delta retorna false', () => {
    expect(detectTamper(base, base)).toBe(false)
  })

  it('age delta <= 10 não dispara', () => {
    expect(detectTamper({ ...base, age: 35 }, { ...base, age: 30 })).toBe(false)
  })

  it('age delta > 10 dispara', () => {
    expect(detectTamper({ ...base, age: 35 }, { ...base, age: 15 })).toBe(true)
  })

  it('liveness delta > 0.3 dispara', () => {
    expect(
      detectTamper({ ...base, livenessScore: 0.95 }, { ...base, livenessScore: 0.5 }),
    ).toBe(true)
  })

  it('liveness delta <= 0.3 não dispara', () => {
    expect(
      detectTamper({ ...base, livenessScore: 0.9 }, { ...base, livenessScore: 0.7 }),
    ).toBe(false)
  })
})
