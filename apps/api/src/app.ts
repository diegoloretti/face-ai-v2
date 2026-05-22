import { Hono } from 'hono'
import { buildCors } from './lib/cors.js'
import { mountVerify } from './routes/verify.js'
import { mountVerifyDeclaration } from './routes/verifyDeclaration.js'
import { mountVerifyJwt } from './routes/verifyJwt.js'
import { mountWellKnownJwks } from './routes/wellKnownJwks.js'
import { mountMetricsScores } from './routes/metricsScores.js'
import { mountMetricsCalibration } from './routes/metricsCalibration.js'
import type { JwtService } from './services/jwt.js'
import type { Db } from './services/db.js'
import type { ServerFeatures } from './services/decisionEngine.js'
import type { Env } from './env.js'
import type { Logger } from './lib/log.js'

export type AppDeps = {
  env: Env
  allowedOrigins: string[]
  jwt: JwtService
  db: Db
  logger: Logger
  extractServerFeatures: (buf: Buffer) => Promise<ServerFeatures>
  checkRateLimit: (ipHash: string) => Promise<{ ok: boolean; retryAfter: number }>
}

export async function createApp(deps: AppDeps): Promise<Hono> {
  const app = new Hono()

  app.use('*', buildCors(deps.allowedOrigins))

  app.get('/', (c) =>
    c.json({ message: 'face-ai api v2', status: 'ok' }),
  )

  mountWellKnownJwks(app, deps.jwt)
  mountVerifyJwt(app, deps.jwt)
  mountVerify(app, {
    env: deps.env,
    jwt: deps.jwt,
    db: deps.db,
    logger: deps.logger,
    extractServerFeatures: deps.extractServerFeatures,
    checkRateLimit: deps.checkRateLimit,
  })
  mountVerifyDeclaration(app, {
    jwt: deps.jwt,
    db: deps.db,
    checkRateLimit: deps.checkRateLimit,
  })
  mountMetricsScores(app, {
    adminToken: deps.env.ADMIN_METRICS_TOKEN,
    supabase: deps.db.raw,
    logger: deps.logger,
  })
  mountMetricsCalibration(app, {
    adminToken: deps.env.ADMIN_METRICS_TOKEN,
    supabase: deps.db.raw,
    logger: deps.logger,
    compositeThreshold: deps.env.COMPOSITE_THRESHOLD_SHADOW,
  })

  return app
}
