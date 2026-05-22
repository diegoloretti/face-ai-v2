import type { Hono } from 'hono'
import { z } from 'zod'
import { hashIp } from '../lib/hashIp.js'
import type { Logger } from '../lib/log.js'

const MAX_BODY_BYTES = 4 * 1024

const BlinkDebugSchema = z
  .object({
    sessionId: z.string().min(1).max(64),
    outcome: z.enum(['completed', 'timeout']),
    baseline: z.number().nullable().optional(),
    thresholdClosed: z.number().optional(),
    leftMin: z.number().optional(),
    leftMax: z.number().optional(),
    rightMin: z.number().optional(),
    rightMax: z.number().optional(),
    blinkCount: z.number().int().nonnegative().optional(),
    frames: z.number().int().nonnegative().optional(),
    elapsedMs: z.number().nonnegative().optional(),
    userAgent: z.string().max(256).optional(),
  })
  .strict()

type Deps = {
  logger: Logger
}

export function mountMetricsBlinkDebug(app: Hono, deps: Deps): void {
  app.post('/metrics/blink-debug', async (c) => {
    const contentLength = Number(c.req.header('content-length') ?? '0')
    if (contentLength > MAX_BODY_BYTES) {
      return c.json({ error: 'payload_too_large' }, 413)
    }
    let parsed: z.infer<typeof BlinkDebugSchema>
    try {
      const body = await c.req.json()
      parsed = BlinkDebugSchema.parse(body)
    } catch {
      return c.json({ error: 'invalid_payload' }, 400)
    }
    const ip = c.req.header('fly-client-ip') ?? c.req.header('x-forwarded-for') ?? '0.0.0.0'
    const ipHash = await hashIp(ip)
    deps.logger.info('blink_debug', { ...parsed, ipHash })
    return c.json({ ok: true })
  })
}
