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
})
