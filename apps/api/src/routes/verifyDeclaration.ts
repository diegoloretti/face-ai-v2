import type { Hono } from 'hono'
import { decodeJwt } from 'jose'
import {
  VerifyDeclarationRequestSchema,
  type VerifyDeclarationResponse,
} from '@face-ai/shared'
import type { JwtService } from '../services/jwt.js'
import type { Db } from '../services/db.js'
import { hashIp } from '../lib/hashIp.js'

type Deps = {
  jwt: JwtService
  db: Db
  checkRateLimit: (ipHash: string) => Promise<{ ok: boolean; retryAfter: number }>
}

export function mountVerifyDeclaration(app: Hono, deps: Deps): void {
  app.post('/verify-declaration', async (c) => {
    const ip = c.req.header('fly-client-ip') ?? c.req.header('x-forwarded-for') ?? '0.0.0.0'
    const ipHash = await hashIp(ip)
    const rate = await deps.checkRateLimit(ipHash)
    if (!rate.ok) {
      return c.json({ error: 'rate_limit', retryAfter: rate.retryAfter }, 429)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid_payload', issues: [{ path: [], message: 'invalid_json' }] }, 400)
    }
    const parsed = VerifyDeclarationRequestSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'invalid_payload', issues: parsed.error.issues }, 400)
    }
    const { sessionId, previousJwt } = parsed.data

    let prev
    try {
      prev = await deps.jwt.verify(previousJwt)
    } catch {
      return c.json({ error: 'invalid_jwt' }, 422 as never)
    }

    if (prev.sub !== sessionId) {
      return c.json({ error: 'session_mismatch' }, 422 as never)
    }
    if (prev.decisao !== 'requer_declaracao') {
      return c.json({ error: 'jwt_decision_mismatch', decisao: prev.decisao }, 422 as never)
    }

    const timestampDeclaracao = new Date().toISOString()
    const newToken = await deps.jwt.sign({
      iss: 'face-ai-v2',
      sub: sessionId,
      decisao: 'aprovado_com_declaracao',
      faixa_etaria: prev.faixa_etaria,
      local: prev.local,
      declaracao: { declarou: true, timestamp: timestampDeclaracao },
      tamper_flag: prev.tamper_flag,
    })

    // decodeJwt: parse seguro do payload sem re-verificar assinatura (ja assinamos acima).
    const newJti = decodeJwt(newToken).jti as string

    await deps.db.updateDeclaration(sessionId, {
      declarou_maior_18: true,
      timestamp_declaracao: timestampDeclaracao,
      decisao: 'aprovado_com_declaracao',
      jwt_jti: newJti,
    })

    const response: VerifyDeclarationResponse = {
      decisao: 'aprovado_com_declaracao',
      jwt: newToken,
      timestamp_declaracao: timestampDeclaracao,
    }
    return c.json(response)
  })
}
