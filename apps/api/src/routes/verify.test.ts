import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose'
import { createJwtService, type JwtService } from '../services/jwt.js'
import { mountVerify } from './verify.js'
import type { Db } from '../services/db.js'
import type { Env } from '../env.js'

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

const jpegMagic = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])

async function makeForm(opts: {
  features: { age: number; antiSpoofScore: number; livenessScore: number; faceDetectionScore: number }
  sessionId?: string
  local?: string
  photo?: Uint8Array
}) {
  const fd = new FormData()
  fd.append('photo', new Blob([opts.photo ?? jpegMagic], { type: 'image/jpeg' }), 'photo.jpg')
  fd.append('clientFeatures', JSON.stringify(opts.features))
  fd.append('sessionId', opts.sessionId ?? 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
  fd.append('local', opts.local ?? 'demo')
  return fd
}

function fakeDb(): Db {
  return {
    insertSessao: vi.fn().mockResolvedValue(undefined),
    updateDeclaration: vi.fn().mockResolvedValue(undefined),
    raw: {} as Db['raw'],
  }
}

const serverApproveFeatures = {
  age: 30,
  antiSpoofScore: 0.95,
  livenessScore: 0.9,
  faceDetectionScore: 0.99,
}

let jwt: JwtService

beforeEach(async () => {
  const kp = await generateKeyPair('ES256', { extractable: true })
  jwt = await createJwtService({
    privatePem: await exportPKCS8(kp.privateKey),
    publicPem: await exportSPKI(kp.publicKey),
    kid: 'k1',
  })
})

describe('POST /verify', () => {
  it('aprova adulto e devolve JWT verificável', async () => {
    const db = fakeDb()
    const app = new Hono()
    mountVerify(app, {
      env: envMock,
      jwt,
      db,
      extractServerFeatures: vi.fn().mockResolvedValue(serverApproveFeatures),
      checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    })
    const fd = await makeForm({ features: serverApproveFeatures })
    const res = await app.request('/verify', { method: 'POST', body: fd })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { decisao: string; faixa_etaria: string; tamper_detected: boolean; jwt: string }
    expect(body.decisao).toBe('aprovado')
    expect(body.faixa_etaria).toBe('22+')
    expect(body.tamper_detected).toBe(false)
    const payload = await jwt.verify(body.jwt)
    expect(payload.decisao).toBe('aprovado')
    expect(db.insertSessao).toHaveBeenCalledOnce()
  })

  it('marca tamper_detected quando age delta > 10', async () => {
    const db = fakeDb()
    const app = new Hono()
    mountVerify(app, {
      env: envMock,
      jwt,
      db,
      extractServerFeatures: vi.fn().mockResolvedValue({ ...serverApproveFeatures, age: 15 }),
      checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    })
    const fd = await makeForm({ features: serverApproveFeatures })
    const res = await app.request('/verify', { method: 'POST', body: fd })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { decisao: string; faixa_etaria: string; tamper_detected: boolean }
    expect(body.tamper_detected).toBe(true)
    expect(body.decisao).toBe('recusado')
    expect(body.faixa_etaria).toBe('13-15')
  })

  it('400 quando clientFeatures malformado', async () => {
    const app = new Hono()
    mountVerify(app, {
      env: envMock,
      jwt,
      db: fakeDb(),
      extractServerFeatures: vi.fn(),
      checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    })
    const fd = new FormData()
    fd.append('photo', new Blob([jpegMagic], { type: 'image/jpeg' }), 'p.jpg')
    fd.append('clientFeatures', 'nao-eh-json')
    fd.append('sessionId', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
    fd.append('local', 'demo')
    const res = await app.request('/verify', { method: 'POST', body: fd })
    expect(res.status).toBe(400)
  })

  it('413 quando foto excede 2MB', async () => {
    const app = new Hono()
    mountVerify(app, {
      env: envMock,
      jwt,
      db: fakeDb(),
      extractServerFeatures: vi.fn(),
      checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    })
    const big = new Uint8Array(2 * 1024 * 1024 + 1)
    big[0] = 0xff
    big[1] = 0xd8
    const fd = await makeForm({ features: serverApproveFeatures, photo: big })
    const res = await app.request('/verify', { method: 'POST', body: fd })
    expect(res.status).toBe(413)
  })

  it('429 quando rate limit excedido', async () => {
    const app = new Hono()
    mountVerify(app, {
      env: envMock,
      jwt,
      db: fakeDb(),
      extractServerFeatures: vi.fn(),
      checkRateLimit: vi.fn().mockResolvedValue({ ok: false, retryAfter: 1234 }),
    })
    const fd = await makeForm({ features: serverApproveFeatures })
    const res = await app.request('/verify', { method: 'POST', body: fd })
    expect(res.status).toBe(429)
    const body = (await res.json()) as { retryAfter: number }
    expect(body.retryAfter).toBe(1234)
  })

  it('422 quando Human não encontra rosto', async () => {
    const app = new Hono()
    mountVerify(app, {
      env: envMock,
      jwt,
      db: fakeDb(),
      extractServerFeatures: vi.fn().mockRejectedValue(
        Object.assign(new Error('no_face'), { name: 'HttpError', status: 422, code: 'no_face' }),
      ),
      checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    })
    const fd = await makeForm({ features: serverApproveFeatures })
    const res = await app.request('/verify', { method: 'POST', body: fd })
    expect(res.status).toBe(422)
  })
})
