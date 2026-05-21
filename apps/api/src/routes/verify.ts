import type { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { ClientFeaturesSchema, type VerifyResponse } from '@face-ai/shared'
import { isHttpError } from '../lib/errors.js'
import { decidir, detectTamper, type ServerFeatures } from '../services/decisionEngine.js'
import type { JwtService } from '../services/jwt.js'
import type { Db } from '../services/db.js'
import type { Env } from '../env.js'
import type { Logger } from '../lib/log.js'
import { hashIp } from '../lib/hashIp.js'
import { buildTelemetryRow, persistTelemetry } from '../services/scoresTelemetry.js'

const MAX_PHOTO_BYTES = 2 * 1024 * 1024
// limite de body inclui overhead do multipart (boundary, headers, sessionId, local, clientFeatures JSON).
// 2.5MB cobre photo de 2MB + ~500KB de overhead, ainda longe de DoS.
const MAX_BODY_BYTES = Math.floor(2.5 * 1024 * 1024)
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png'])

type Deps = {
  env: Env
  jwt: JwtService
  db: Db
  logger: Logger
  extractServerFeatures: (buf: Buffer) => Promise<ServerFeatures>
  checkRateLimit: (ipHash: string) => Promise<{ ok: boolean; retryAfter: number }>
}

export function mountVerify(app: Hono, deps: Deps): void {
  app.post(
    '/verify',
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => c.json({ error: 'photo_too_large', limit: MAX_BODY_BYTES }, 413),
    }),
    async (c) => {
      const ip = c.req.header('fly-client-ip') ?? c.req.header('x-forwarded-for') ?? '0.0.0.0'
      const userAgent = c.req.header('user-agent') ?? ''
      const ipHash = await hashIp(ip)
      const uaHash = await hashIp(userAgent)

      const rate = await deps.checkRateLimit(ipHash)
      if (!rate.ok) {
        return c.json({ error: 'rate_limit', retryAfter: rate.retryAfter }, 429)
      }

      // Codex round 1 - Important 1: rejeitar pelo Content-Length ANTES de parsear o multipart.
      const contentLength = Number(c.req.header('content-length') ?? '0')
      if (contentLength > 0 && contentLength > MAX_BODY_BYTES) {
        return c.json({ error: 'photo_too_large', size: contentLength }, 413)
      }

      const form = await c.req.formData()
      const photo = form.get('photo')
      if (!(photo instanceof Blob)) {
        return c.json({ error: 'invalid_payload', issues: [{ path: ['photo'], message: 'required' }] }, 400)
      }
      if (!ALLOWED_MIME.has(photo.type)) {
        return c.json({ error: 'photo_wrong_type', mime: photo.type }, 415 as never)
      }
      if (photo.size > MAX_PHOTO_BYTES) {
        return c.json({ error: 'photo_too_large', size: photo.size }, 413)
      }

      const rawFeatures = form.get('clientFeatures')
      let clientFeatures: ServerFeatures
      try {
        const parsed = JSON.parse(String(rawFeatures))
        clientFeatures = ClientFeaturesSchema.parse(parsed)
      } catch {
        return c.json(
          { error: 'invalid_payload', issues: [{ path: ['clientFeatures'], message: 'invalid_json_or_schema' }] },
          400,
        )
      }

      const sessionId = String(form.get('sessionId') ?? '')
      const local = String(form.get('local') ?? '')
      if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
        return c.json({ error: 'invalid_payload', issues: [{ path: ['sessionId'], message: 'not_uuid' }] }, 400)
      }

      try {
        const buf = Buffer.from(await photo.arrayBuffer())
        const serverFeaturesRaw = await deps.extractServerFeatures(buf)
        // Blink vem do client (server roda 1 frame, blink e temporal).
        const serverFeatures: ServerFeatures = {
          ...serverFeaturesRaw,
          blinkDetected: clientFeatures.blinkDetected ?? false,
        }
        const tamperDetected = detectTamper(clientFeatures, serverFeatures)
        const decision = decidir(serverFeatures, deps.env)

        const token = await deps.jwt.sign({
          iss: 'face-ai-v2',
          sub: sessionId,
          decisao: decision.decisao,
          faixa_etaria: decision.faixa_etaria,
          local,
          declaracao: null,
          tamper_flag: tamperDetected,
        })

        const jti = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
        ).jti as string

        await deps.db.insertSessao({
          id: sessionId,
          local,
          faixa_etaria: decision.faixa_etaria,
          decisao: decision.decisao,
          motivo: decision.motivo,
          jwt_jti: jti,
          tamper_detected: tamperDetected,
          client_features: clientFeatures,
          server_features: serverFeatures,
          ip_hash: ipHash,
          user_agent_hash: uaHash,
        })

        const telemetryRow = buildTelemetryRow(
          sessionId,
          decision,
          serverFeatures.age,
          deps.env.DECISION_MODE,
        )
        persistTelemetry(deps.db.raw, telemetryRow, deps.logger)

        const response: VerifyResponse = {
          decisao: decision.decisao,
          faixa_etaria: decision.faixa_etaria,
          jwt: token,
          motivo: decision.motivo,
          tamper_detected: tamperDetected,
        }
        return c.json(response)
      } catch (err) {
        if (isHttpError(err)) {
          return c.json({ error: err.code, ...(err.detail ?? {}) }, err.status as never)
        }
        if (err instanceof Error && 'code' in err && typeof err.code === 'string') {
          const status = (err as { status?: number }).status ?? 500
          return c.json({ error: err.code }, status as never)
        }
        throw err
      }
    },
  )
}
