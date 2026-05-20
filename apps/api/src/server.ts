import { serve } from '@hono/node-server'
import { loadEnv } from './env.js'
import { createApp } from './app.js'
import { createJwtService } from './services/jwt.js'
import { buildSupabaseClient, createDb } from './services/db.js'
import { extractServerFeatures } from './services/humanRunner.js'
import { checkRateLimit } from './services/rateLimit.js'
import { createLogger } from './lib/log.js'

const env = loadEnv()
const bootLog = createLogger({ correlationId: 'boot' })

const jwt = await createJwtService({
  privatePem: env.JWT_PRIVATE_KEY_PEM,
  publicPem: env.JWT_PUBLIC_KEY_PEM,
  kid: 'key-2026-05',
})

const supabase = buildSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const db = createDb(supabase)

bootLog.info('warming up Human models...')
const t0 = Date.now()
await extractServerFeatures(Buffer.alloc(0)).catch(() => {})
bootLog.info('Human ready', { ms: Date.now() - t0 })

const app = await createApp({
  allowedOrigins: env.ALLOWED_ORIGIN,
  jwt,
  db,
  extractServerFeatures,
  checkRateLimit: (ipHash) => checkRateLimit(supabase, ipHash, 'verify'),
})

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  bootLog.info('face-ai api v2 listening', { port: info.port, region: process.env.FLY_REGION ?? 'local' })
})
