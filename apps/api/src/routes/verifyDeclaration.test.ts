import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose'
import { createJwtService, type JwtService } from '../services/jwt.js'
import { mountVerifyDeclaration } from './verifyDeclaration.js'
import type { Db } from '../services/db.js'

let jwt: JwtService

beforeEach(async () => {
  const kp = await generateKeyPair('ES256', { extractable: true })
  jwt = await createJwtService({
    privatePem: await exportPKCS8(kp.privateKey),
    publicPem: await exportSPKI(kp.publicKey),
    kid: 'k1',
  })
})

const sessionId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'

function fakeDb(): Db {
  return {
    insertSessao: vi.fn(),
    updateDeclaration: vi.fn().mockResolvedValue(undefined),
    raw: {} as Db['raw'],
  }
}

describe('POST /verify-declaration', () => {
  it('aprova quando JWT prévio é válido + decisao=requer_declaracao', async () => {
    const db = fakeDb()
    const app = new Hono()
    mountVerifyDeclaration(app, {
      jwt,
      db,
      checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    })
    const previous = await jwt.sign({
      iss: 'face-ai-v2',
      sub: sessionId,
      decisao: 'requer_declaracao',
      faixa_etaria: '16-21',
      local: 'demo',
      declaracao: null,
      tamper_flag: false,
    })
    const res = await app.request('/verify-declaration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        previousJwt: previous,
        declaroSerMaiorDe18: true,
      }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { decisao: string; jwt: string; timestamp_declaracao: string }
    expect(body.decisao).toBe('aprovado_com_declaracao')
    expect(typeof body.jwt).toBe('string')
    expect(body.timestamp_declaracao).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    const newPayload = await jwt.verify(body.jwt)
    expect(newPayload.decisao).toBe('aprovado_com_declaracao')
    expect(newPayload.declaracao?.declarou).toBe(true)
    expect(db.updateDeclaration).toHaveBeenCalledOnce()
  })

  it('422 quando JWT prévio não tem decisao=requer_declaracao', async () => {
    const app = new Hono()
    mountVerifyDeclaration(app, {
      jwt,
      db: fakeDb(),
      checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    })
    const previous = await jwt.sign({
      iss: 'face-ai-v2',
      sub: sessionId,
      decisao: 'aprovado',
      faixa_etaria: '22+',
      local: 'demo',
      declaracao: null,
      tamper_flag: false,
    })
    const res = await app.request('/verify-declaration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, previousJwt: previous, declaroSerMaiorDe18: true }),
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('jwt_decision_mismatch')
  })

  it('422 quando sessionId não bate com sub do JWT', async () => {
    const app = new Hono()
    mountVerifyDeclaration(app, {
      jwt,
      db: fakeDb(),
      checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    })
    const previous = await jwt.sign({
      iss: 'face-ai-v2',
      sub: sessionId,
      decisao: 'requer_declaracao',
      faixa_etaria: '16-21',
      local: 'demo',
      declaracao: null,
      tamper_flag: false,
    })
    const res = await app.request('/verify-declaration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        previousJwt: previous,
        declaroSerMaiorDe18: true,
      }),
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('session_mismatch')
  })

  it('422 quando JWT prévio é inválido', async () => {
    const app = new Hono()
    mountVerifyDeclaration(app, {
      jwt,
      db: fakeDb(),
      checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    })
    const res = await app.request('/verify-declaration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        previousJwt: 'lixo',
        declaroSerMaiorDe18: true,
      }),
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('invalid_jwt')
  })

  it('400 quando declaroSerMaiorDe18 não é literal true', async () => {
    const app = new Hono()
    mountVerifyDeclaration(app, {
      jwt,
      db: fakeDb(),
      checkRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    })
    const previous = await jwt.sign({
      iss: 'face-ai-v2',
      sub: sessionId,
      decisao: 'requer_declaracao',
      faixa_etaria: '16-21',
      local: 'demo',
      declaracao: null,
      tamper_flag: false,
    })
    const res = await app.request('/verify-declaration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, previousJwt: previous, declaroSerMaiorDe18: false }),
    })
    expect(res.status).toBe(400)
  })
})
