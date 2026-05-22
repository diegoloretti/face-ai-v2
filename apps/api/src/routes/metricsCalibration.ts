import type { Hono } from 'hono'
import type { SupabaseClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'node:crypto'
import type { Logger } from '../lib/log.js'
import { aggregateCalibration, fetchCalibrationRows } from '../services/calibrationQuery.js'

type Deps = {
  adminToken: string | undefined
  supabase: SupabaseClient
  logger: Logger
  compositeThreshold: number
}

const MAX_WINDOW_DAYS = 90
const DEFAULT_WINDOW_DAYS = 7

function parseIsoOr(value: string | undefined, fallback: Date): Date | null {
  if (value === undefined) return fallback
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function mountMetricsCalibration(app: Hono, deps: Deps): void {
  if (!deps.adminToken) return
  const expected = deps.adminToken

  app.get('/metrics/calibration', async (c) => {
    const provided = c.req.header('x-admin-token')
    if (typeof provided !== 'string') {
      return c.json({ error: 'unauthorized' }, 401)
    }
    const a = Buffer.from(expected)
    const b = Buffer.from(provided)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return c.json({ error: 'unauthorized' }, 401)
    }

    const now = new Date()
    const defaultSince = new Date(now.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const since = parseIsoOr(c.req.query('since'), defaultSince)
    const until = parseIsoOr(c.req.query('until'), now)

    if (since === null || until === null) {
      return c.json({ error: 'invalid_date', message: 'since/until must be ISO 8601' }, 400)
    }
    if (until.getTime() <= since.getTime()) {
      return c.json({ error: 'invalid_range', message: 'until must be after since' }, 400)
    }
    if (until.getTime() > now.getTime() + 1000) {
      return c.json({ error: 'invalid_range', message: 'until cannot be in the future' }, 400)
    }
    const earliestAllowed = new Date(now.getTime() - MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    if (since.getTime() < earliestAllowed.getTime()) {
      return c.json(
        { error: 'window_too_old', message: `since cannot be older than ${MAX_WINDOW_DAYS} days` },
        400,
      )
    }

    const fetched = await fetchCalibrationRows(deps.supabase, {
      since: since.toISOString(),
      until: until.toISOString(),
    })
    if (!fetched.ok) {
      if (fetched.error === 'overflow') {
        return c.json(
          {
            error: 'window_too_large',
            message: 'Reduce ?since window. Got >50000 rows, max 50000.',
            total_capped_at: 50000,
          },
          413,
        )
      }
      deps.logger.error('metrics_calibration query failed', { error: fetched.message ?? 'unknown' })
      return c.json({ error: 'internal' }, 500)
    }

    const agg = aggregateCalibration(fetched.rows, {
      since: since.toISOString(),
      until: until.toISOString(),
      compositeThreshold: deps.compositeThreshold,
    })

    c.header('cache-control', 'no-store')
    return c.json(agg, 200)
  })
}
