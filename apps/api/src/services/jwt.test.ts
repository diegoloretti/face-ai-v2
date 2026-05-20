import { describe, it, expect, beforeAll } from 'vitest'
import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose'
import { createJwtService } from './jwt.js'
import type { JwtPayload } from '@face-ai/shared'

let privatePem: string
let publicPem: string

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true })
  privatePem = await exportPKCS8(privateKey)
  publicPem = await exportSPKI(publicKey)
})

function basePayload(): Omit<JwtPayload, 'iat' | 'exp' | 'jti'> {
  return {
    iss: 'face-ai-v2',
    sub: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    decisao: 'aprovado',
    faixa_etaria: '22+',
    local: 'demo',
    declaracao: null,
    tamper_flag: false,
  }
}

describe('jwt service', () => {
  it('sign + verify roundtrip preserva claims', async () => {
    const svc = await createJwtService({ privatePem, publicPem, kid: 'k1' })
    const token = await svc.sign(basePayload())
    const payload = await svc.verify(token)
    expect(payload.decisao).toBe('aprovado')
    expect(payload.sub).toBe('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
    expect(payload.exp - payload.iat).toBe(7 * 24 * 3600)
    expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('verify rejeita token assinado com chave diferente', async () => {
    const svc = await createJwtService({ privatePem, publicPem, kid: 'k1' })
    const { privateKey: otherPriv } = await generateKeyPair('ES256', { extractable: true })
    const otherPem = await exportPKCS8(otherPriv)
    const otherSvc = await createJwtService({
      privatePem: otherPem,
      publicPem,
      kid: 'k1',
    })
    const forged = await otherSvc.sign(basePayload())
    await expect(svc.verify(forged)).rejects.toThrow()
  })

  it('JWKS expõe x/y/kid/alg corretos', async () => {
    const svc = await createJwtService({ privatePem, publicPem, kid: 'key-2026-05' })
    const jwks = await svc.getJwks()
    expect(jwks.keys).toHaveLength(1)
    const k = jwks.keys[0]
    expect(k.kty).toBe('EC')
    expect(k.crv).toBe('P-256')
    expect(k.alg).toBe('ES256')
    expect(k.kid).toBe('key-2026-05')
    expect(k.use).toBe('sig')
    expect(typeof k.x).toBe('string')
    expect(typeof k.y).toBe('string')
  })
})
