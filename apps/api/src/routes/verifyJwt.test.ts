import { describe, it, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import { generateKeyPair, exportPKCS8, exportSPKI, SignJWT } from 'jose'
import { createJwtService, type JwtService } from '../services/jwt.js'
import { mountVerifyJwt } from './verifyJwt.js'

let svc: JwtService

beforeAll(async () => {
  const kp = await generateKeyPair('ES256', { extractable: true })
  svc = await createJwtService({
    privatePem: await exportPKCS8(kp.privateKey),
    publicPem: await exportSPKI(kp.publicKey),
    kid: 'k1',
  })
})

const baseClaims = {
  iss: 'face-ai-v2' as const,
  sub: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  decisao: 'aprovado' as const,
  faixa_etaria: '22+' as const,
  local: 'demo',
  declaracao: null,
  tamper_flag: false,
}

describe('GET /verify-jwt', () => {
  it('retorna valid:true + payload pra JWT válido', async () => {
    const app = new Hono()
    mountVerifyJwt(app, svc)
    const token = await svc.sign(baseClaims)
    const res = await app.request(`/verify-jwt?token=${encodeURIComponent(token)}`)
    expect(res.status).toBe(200)
    const body = await res.json() as { valid: boolean; expired: boolean; payload: { decisao: string } | null }
    expect(body.valid).toBe(true)
    expect(body.expired).toBe(false)
    expect(body.payload?.decisao).toBe('aprovado')
  })

  it('retorna valid:false + payload:null pra JWT inválido', async () => {
    const app = new Hono()
    mountVerifyJwt(app, svc)
    const res = await app.request('/verify-jwt?token=nao-eh-um-jwt')
    expect(res.status).toBe(200)
    const body = await res.json() as { valid: boolean; payload: unknown }
    expect(body.valid).toBe(false)
    expect(body.payload).toBeNull()
  })

  it('retorna 400 quando token ausente', async () => {
    const app = new Hono()
    mountVerifyJwt(app, svc)
    const res = await app.request('/verify-jwt')
    expect(res.status).toBe(400)
  })

  it('retorna valid:false + expired:true para JWT expirado', async () => {
    const kp = await generateKeyPair('ES256', { extractable: true })
    const expiredToken = await new SignJWT({ ...baseClaims, jti: 'expired-jti-test' })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 8 * 24 * 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
      .sign(kp.privateKey)
    const svcExpired = await createJwtService({
      privatePem: await exportPKCS8(kp.privateKey),
      publicPem: await exportSPKI(kp.publicKey),
      kid: 'k1',
    })
    const appExpired = new Hono()
    mountVerifyJwt(appExpired, svcExpired)
    const res = await appExpired.request(`/verify-jwt?token=${encodeURIComponent(expiredToken)}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { valid: boolean; expired: boolean; payload: unknown }
    expect(body.valid).toBe(false)
    expect(body.expired).toBe(true)
    expect(body.payload).toBeNull()
  })
})
