import { describe, it, expect, vi, beforeAll } from 'vitest'
import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose'
import { createJwtService } from './services/jwt.js'
import { createApp } from './app.js'
import type { Db } from './services/db.js'

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
