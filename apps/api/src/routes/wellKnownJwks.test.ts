import { describe, it, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose'
import { createJwtService } from '../services/jwt.js'
import { mountWellKnownJwks } from './wellKnownJwks.js'

let privatePem: string
let publicPem: string

beforeAll(async () => {
  const kp = await generateKeyPair('ES256', { extractable: true })
  privatePem = await exportPKCS8(kp.privateKey)
  publicPem = await exportSPKI(kp.publicKey)
})

describe('GET /.well-known/jwks.json', () => {
  it('expõe a chave pública em formato JWK', async () => {
    const jwt = await createJwtService({ privatePem, publicPem, kid: 'k-test' })
    const app = new Hono()
    mountWellKnownJwks(app, jwt)
    const res = await app.request('/.well-known/jwks.json')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('cache-control')).toContain('max-age')
    const body = await res.json() as { keys: Array<{ kid: string; alg: string }> }
    expect(body.keys).toHaveLength(1)
    expect(body.keys[0].kid).toBe('k-test')
    expect(body.keys[0].alg).toBe('ES256')
  })
})
