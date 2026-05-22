import { describe, it, expect } from 'vitest'
import { decidir, detectTamper, type ServerFeatures } from './decisionEngine.js'
import type { Env } from '../env.js'

const envDefaults: Env = {
  PORT: 8080,
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-placeholder',
  JWT_PRIVATE_KEY_PEM: 'k',
  JWT_PUBLIC_KEY_PEM: 'k',
  ALLOWED_ORIGIN: ['http://localhost:5173'],
  LIVENESS_THRESHOLD: 0.8,
  ANTISPOOF_THRESHOLD: 0.85,
  FACE_DETECTION_THRESHOLD: 0,
  COMPOSITE_W_ANTISPOOF: 0.4,
  COMPOSITE_W_LIVENESS: 0.4,
  COMPOSITE_W_FACE_DETECTION: 0.2,
  COMPOSITE_THRESHOLD_SHADOW: 0.78,
  DECISION_MODE: 'legacy_and',
  REQUIRE_BLINK: false,
  ADMIN_METRICS_TOKEN: undefined,
}

function envWith(overrides: Partial<Env> = {}): Env {
  return { ...envDefaults, ...overrides }
}

function features(overrides: Partial<ServerFeatures> = {}): ServerFeatures {
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
    const r = decidir(features(), envWith())
    expect(r.decisao).toBe('aprovado')
    expect(r.faixa_etaria).toBe('22+')
    expect(r.motivo).toBeNull()
  })

  it('recusa quando liveness abaixo do threshold', () => {
    const r = decidir(features({ livenessScore: envDefaults.LIVENESS_THRESHOLD - 0.01 }), envWith())
    expect(r.decisao).toBe('recusado')
    expect(r.motivo).toBe('liveness_fail')
  })

  it('recusa quando antispoof abaixo do threshold', () => {
    const r = decidir(features({ antiSpoofScore: envDefaults.ANTISPOOF_THRESHOLD - 0.01 }), envWith())
    expect(r.decisao).toBe('recusado')
    expect(r.motivo).toBe('antispoof_fail')
  })

  it('liveness fail tem precedência sobre antispoof fail', () => {
    const r = decidir(
      features({
        livenessScore: envDefaults.LIVENESS_THRESHOLD - 0.01,
        antiSpoofScore: envDefaults.ANTISPOOF_THRESHOLD - 0.01,
      }),
      envWith(),
    )
    expect(r.motivo).toBe('liveness_fail')
  })

  it('pede declaração na faixa 16-21', () => {
    const r = decidir(features({ age: 18 }), envWith())
    expect(r.decisao).toBe('requer_declaracao')
    expect(r.faixa_etaria).toBe('16-21')
    expect(r.motivo).toBeNull()
  })

  it('recusa hard na faixa 13-15 (sem declaração)', () => {
    const r = decidir(features({ age: 14 }), envWith())
    expect(r.decisao).toBe('recusado')
    expect(r.faixa_etaria).toBe('13-15')
    expect(r.motivo).toBe('faixa_etaria_minor')
  })

  it('recusa hard na faixa <13', () => {
    const r = decidir(features({ age: 10 }), envWith())
    expect(r.decisao).toBe('recusado')
    expect(r.faixa_etaria).toBe('<13')
    expect(r.motivo).toBe('faixa_etaria_minor')
  })

  it('limite inferior faixa 22+ é 22 (inclusivo)', () => {
    expect(decidir(features({ age: 21.999 }), envWith()).decisao).toBe('requer_declaracao')
    expect(decidir(features({ age: 22 }), envWith()).decisao).toBe('aprovado')
  })

  it('legacy_and: livenessScore exatamente no threshold passa (sem off-by-one)', () => {
    const r = decidir(features({ livenessScore: 0.8 }), envWith())
    expect(r.flags.failed_liveness).toBe(false)
  })

  it('scores breakdown sempre populado com composite calculado', () => {
    const r = decidir(features(), envWith())
    expect(r.scores.composite).toBeCloseTo(0.4 * 0.95 + 0.4 * 0.9 + 0.2 * 0.99, 5)
    expect(r.scores.antiSpoof).toBe(0.95)
    expect(r.scores.liveness).toBe(0.9)
    expect(r.scores.faceDetection).toBe(0.99)
    expect(r.scores.blinkDetected).toBe(false)
  })

  it('flags individuais sempre populadas independente do motivo', () => {
    const r = decidir(features({ antiSpoofScore: 0.5 }), envWith())
    expect(r.flags.failed_antispoof).toBe(true)
    expect(r.flags.failed_liveness).toBe(false)
    expect(r.flags.failed_composite_shadow).toBeDefined()
    expect(r.flags.failed_blink).toBe(false)
  })

  it('composite mode aprova quando legacy reprovaria (antiSpoof=0.7 mas composite=0.84)', () => {
    const r = decidir(
      features({ antiSpoofScore: 0.7, livenessScore: 0.9, faceDetectionScore: 1.0 }),
      envWith({ DECISION_MODE: 'composite' }),
    )
    expect(r.scores.composite).toBeCloseTo(0.84, 5)
    expect(r.decisao).toBe('aprovado')
    expect(r.motivo).toBeNull()
  })

  it('composite mode recusa quando composite < threshold', () => {
    const r = decidir(
      features({ antiSpoofScore: 0.3, livenessScore: 0.3, faceDetectionScore: 0.3 }),
      envWith({ DECISION_MODE: 'composite' }),
    )
    expect(r.decisao).toBe('recusado')
    expect(r.motivo).toBe('composite_fail')
  })

  it('REQUIRE_BLINK=true recusa quando blinkDetected ausente em legacy', () => {
    const r = decidir(
      features({ blinkDetected: false }),
      envWith({ REQUIRE_BLINK: true }),
    )
    expect(r.decisao).toBe('recusado')
    expect(r.motivo).toBe('blink_missing')
    expect(r.flags.failed_blink).toBe(true)
  })

  it('REQUIRE_BLINK=true recusa quando blinkDetected ausente em composite mode', () => {
    const r = decidir(
      features({ blinkDetected: false }),
      envWith({ REQUIRE_BLINK: true, DECISION_MODE: 'composite' }),
    )
    expect(r.motivo).toBe('blink_missing')
  })

  it('REQUIRE_BLINK=false ignora blinkDetected ausente', () => {
    const r = decidir(features({ blinkDetected: false }), envWith())
    expect(r.flags.failed_blink).toBe(false)
    expect(r.decisao).toBe('aprovado')
  })

  it('faceDetectionScore NaN normaliza pra 0 sem quebrar composite', () => {
    const r = decidir(
      features({ faceDetectionScore: Number.NaN }),
      envWith(),
    )
    expect(Number.isFinite(r.scores.composite)).toBe(true)
    expect(r.scores.faceDetection).toBe(0)
  })

  it('NaN em antiSpoofScore vira 0 e recusa antispoof_fail', () => {
    const r = decidir(features({ antiSpoofScore: NaN }), envWith())
    expect(r.decisao).toBe('recusado')
    expect(r.motivo).toBe('antispoof_fail')
    expect(r.scores.antiSpoof).toBe(0)
    expect(r.flags.failed_antispoof).toBe(true)
  })

  it('NaN em livenessScore vira 0 e recusa liveness_fail', () => {
    const r = decidir(features({ livenessScore: NaN }), envWith())
    expect(r.decisao).toBe('recusado')
    expect(r.motivo).toBe('liveness_fail')
    expect(r.scores.liveness).toBe(0)
    expect(r.flags.failed_liveness).toBe(true)
  })

  it('undefined em antiSpoofScore comporta como NaN', () => {
    const r = decidir(features({ antiSpoofScore: undefined as unknown as number }), envWith())
    expect(r.decisao).toBe('recusado')
    expect(r.motivo).toBe('antispoof_fail')
    expect(r.scores.antiSpoof).toBe(0)
  })

  it('Infinity em antiSpoofScore vira 0 (não-finito)', () => {
    const r = decidir(features({ antiSpoofScore: Infinity }), envWith())
    expect(r.decisao).toBe('recusado')
    expect(r.motivo).toBe('antispoof_fail')
    expect(r.scores.antiSpoof).toBe(0)
  })

  it('composite usa antiSpoof normalizado quando NaN', () => {
    const r = decidir(
      features({ antiSpoofScore: NaN, livenessScore: 0.9, faceDetectionScore: 0.99 }),
      envWith(),
    )
    // composite = 0.4*0 + 0.4*0.9 + 0.2*0.99 = 0.558
    expect(r.scores.composite).toBeCloseTo(0.4 * 0 + 0.4 * 0.9 + 0.2 * 0.99, 5)
    expect(r.flags.failed_composite_shadow).toBe(true)
  })

  it('faceDetectionScore NaN continua sendo tratado como 0', () => {
    const r = decidir(features({ faceDetectionScore: NaN }), envWith())
    expect(r.scores.faceDetection).toBe(0)
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
