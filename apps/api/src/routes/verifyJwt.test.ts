import { describe, it, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose'
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
})
