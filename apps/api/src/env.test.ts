import { describe, it, expect } from 'vitest'
import { EnvSchema } from './env.js'

const baseValid = {
  PORT: '8080',
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-placeholder',
  JWT_PRIVATE_KEY_PEM: '-----BEGIN PRIVATE KEY-----\nMIG...\n-----END PRIVATE KEY-----',
  JWT_PUBLIC_KEY_PEM: '-----BEGIN PUBLIC KEY-----\nMFkw...\n-----END PUBLIC KEY-----',
  ALLOWED_ORIGIN: 'http://localhost:5173',
}

describe('EnvSchema', () => {
  it('aceita env completo válido', () => {
    const parsed = EnvSchema.parse(baseValid)
    expect(parsed.PORT).toBe(8080)
    expect(parsed.ALLOWED_ORIGIN).toEqual(['http://localhost:5173'])
  })

  it('PORT default é 8080 quando ausente', () => {
    const { PORT: _ignored, ...rest } = baseValid
    expect(EnvSchema.parse(rest).PORT).toBe(8080)
  })

  it('ALLOWED_ORIGIN aceita múltiplos separados por vírgula', () => {
    const parsed = EnvSchema.parse({
      ...baseValid,
      ALLOWED_ORIGIN: 'http://localhost:5173,https://face-ai.vercel.app',
    })
    expect(parsed.ALLOWED_ORIGIN).toEqual(['http://localhost:5173', 'https://face-ai.vercel.app'])
  })

  it('rejeita SUPABASE_URL não-URL', () => {
    expect(() =>
      EnvSchema.parse({ ...baseValid, SUPABASE_URL: 'not-a-url' }),
    ).toThrow()
  })

  it('rejeita JWT_PRIVATE_KEY_PEM ausente', () => {
    const { JWT_PRIVATE_KEY_PEM: _ignored, ...rest } = baseValid
    expect(() => EnvSchema.parse(rest)).toThrow()
  })

  it('LIVENESS_THRESHOLD default 0.8', () => {
    const parsed = EnvSchema.parse(baseValid)
    expect(parsed.LIVENESS_THRESHOLD).toBe(0.8)
  })

  it('ANTISPOOF_THRESHOLD default 0.85', () => {
    const parsed = EnvSchema.parse(baseValid)
    expect(parsed.ANTISPOOF_THRESHOLD).toBe(0.85)
  })

  it('rejeita COMPOSITE_W_ANTISPOOF NaN como hard error', () => {
    expect(() =>
      EnvSchema.parse({ ...baseValid, COMPOSITE_W_ANTISPOOF: 'NaN' }),
    ).toThrow()
  })

  it('rejeita COMPOSITE_W_LIVENESS Infinity como hard error', () => {
    expect(() =>
      EnvSchema.parse({ ...baseValid, COMPOSITE_W_LIVENESS: 'Infinity' }),
    ).toThrow()
  })

  it('rejeita ANTISPOOF_THRESHOLD NaN como hard error', () => {
    expect(() =>
      EnvSchema.parse({ ...baseValid, ANTISPOOF_THRESHOLD: 'NaN' }),
    ).toThrow()
  })

  it('pesos do composite default somam 1.0', () => {
    const parsed = EnvSchema.parse(baseValid)
    const sum =
      parsed.COMPOSITE_W_ANTISPOOF +
      parsed.COMPOSITE_W_LIVENESS +
      parsed.COMPOSITE_W_FACE_DETECTION
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6)
  })

  it('aceita pesos do composite somando 1.0 sem warning', () => {
    const parsed = EnvSchema.parse(baseValid)
    expect(parsed.COMPOSITE_W_ANTISPOOF).toBe(0.4)
  })

  it('aceita pesos do composite fora de soma 1.0 (sem hard error - warning e runtime)', () => {
    const parsed = EnvSchema.parse({ ...baseValid, COMPOSITE_W_ANTISPOOF: '0.5' })
    expect(parsed.COMPOSITE_W_ANTISPOOF).toBe(0.5)
    // Soma fora de tolerancia vira bootLog.warn no boot, nao Zod refine.
    // Validacao do warning e feita em compositeWeightsCheck.test.ts.
  })

  it('aceita soma exatamente 1.001 (dentro da tolerancia)', () => {
    const parsed = EnvSchema.parse({
      ...baseValid,
      COMPOSITE_W_ANTISPOOF: '0.401',
      COMPOSITE_W_LIVENESS: '0.4',
      COMPOSITE_W_FACE_DETECTION: '0.2',
    })
    const sum =
      parsed.COMPOSITE_W_ANTISPOOF +
      parsed.COMPOSITE_W_LIVENESS +
      parsed.COMPOSITE_W_FACE_DETECTION
    expect(Math.abs(sum - 1)).toBeLessThan(1.5e-3)
  })

  it('DECISION_MODE default legacy_and', () => {
    expect(EnvSchema.parse(baseValid).DECISION_MODE).toBe('legacy_and')
  })

  it('DECISION_MODE aceita composite', () => {
    const parsed = EnvSchema.parse({ ...baseValid, DECISION_MODE: 'composite' })
    expect(parsed.DECISION_MODE).toBe('composite')
  })

  it('REQUIRE_BLINK default false', () => {
    expect(EnvSchema.parse(baseValid).REQUIRE_BLINK).toBe(false)
  })

  it('REQUIRE_BLINK true aceita string "true"', () => {
    const parsed = EnvSchema.parse({ ...baseValid, REQUIRE_BLINK: 'true' })
    expect(parsed.REQUIRE_BLINK).toBe(true)
  })

  it('ADMIN_METRICS_TOKEN undefined quando ausente', () => {
    expect(EnvSchema.parse(baseValid).ADMIN_METRICS_TOKEN).toBeUndefined()
  })

  it('ADMIN_METRICS_TOKEN aceita string >= 32 chars', () => {
    const token = 'a'.repeat(32)
    const parsed = EnvSchema.parse({ ...baseValid, ADMIN_METRICS_TOKEN: token })
    expect(parsed.ADMIN_METRICS_TOKEN).toBe(token)
  })

  it('rejeita ADMIN_METRICS_TOKEN curto após trim', () => {
    expect(() =>
      EnvSchema.parse({ ...baseValid, ADMIN_METRICS_TOKEN: '  short  ' }),
    ).toThrow(/ADMIN_METRICS_TOKEN/)
  })
})
