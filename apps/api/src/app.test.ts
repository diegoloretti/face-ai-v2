import { describe, it, expect, vi, beforeAll } from 'vitest'
import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose'
import { createJwtService } from './services/jwt.js'
import { createApp } from './app.js'
import type { Db } from './services/db.js'
import type { Env } from './env.js'

const envMock: Env = {
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

let app: Awaited<ReturnType<typeof createApp>>

beforeAll(async () => {
  const kp = await generateKeyPair('ES256', { extractable: true })
  const jwt = await createJwtService({
    privatePem: await exportPKCS8(kp.privateKey),
    publicPem: await exportSPKI(kp.publicKey),
    kid: 'k1',
  })
  const db: Db = {
    insertSessao: vi.fn(),
    updateDeclaration: vi.fn(),
    raw: {} as Db['raw'],
  }
  app = await createApp({
    env: envMock,
    allowedOrigins: ['http://localhost:5173'],
    jwt,
    db,
    extractServerFeatures: vi.fn().mockResolvedValue({
      age: 30,
      antiSpoofScore: 0.95,
      livenessScore: 0.9,
      faceDetectionScore: 0.99,
    }),
    checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
  })
})

describe('face-ai API app composer', () => {
  it('GET / retorna health', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.status).toBe('ok')
  })

  it('GET /.well-known/jwks.json existe', async () => {
    const res = await app.request('/.well-known/jwks.json')
    expect(res.status).toBe(200)
  })

  it('GET /unknown retorna 404', async () => {
    const res = await app.request('/unknown')
    expect(res.status).toBe(404)
  })
})
