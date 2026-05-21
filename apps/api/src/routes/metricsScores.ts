import type { Hono } from 'hono'
import type { SupabaseClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'node:crypto'
import type { Logger } from '../lib/log.js'

const MAX_LIMIT = 10000
const DEFAULT_LIMIT = 1000

type Deps = {
  adminToken: string | undefined
  supabase: SupabaseClient
  logger: Logger
}

export function mountMetricsScores(app: Hono, deps: Deps): void {
  if (!deps.adminToken) {
    return
  }
  const expected = deps.adminToken

  app.get('/metrics/scores', async (c) => {
    const provided = c.req.header('x-admin-token')
    if (typeof provided !== 'string') {
      return c.json({ error: 'unauthorized' }, 401)
    }
    const a = Buffer.from(expected)
    const b = Buffer.from(provided)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return c.json({ error: 'unauthorized' }, 401)
    }

    const limitParam = c.req.query('limit') ?? String(DEFAULT_LIMIT)
    const limit = Number(limitParam)
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return c.json({ error: 'invalid_limit', max: MAX_LIMIT }, 400)
    }

    const { data, error } = await deps.supabase
      .from('verification_scores')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      deps.logger.error('metrics_scores query failed', { error: error.message })
      return c.json({ error: 'internal' }, 500)
    }

    const header = [
      'created_at',
      'decision_mode',
      'session_id',
      'age',
      'anti_spoof_score',
      'liveness_score',
      'face_detection_score',
      'composite_score',
      'blink_detected',
      'failed_liveness',
      'failed_antispoof',
      'failed_composite_shadow',
      'failed_blink',
      'decisao',
      'motivo',
      'faixa_etaria',
    ]
    const rows = (data ?? []).map((r: Record<string, unknown>) =>
      header.map((k) => csvEscape(r[k])).join(','),
    )
    const csv = [header.join(','), ...rows].join('\n')

    c.header('content-type', 'text/csv; charset=utf-8')
    c.header('cache-control', 'no-store')
    c.header('content-disposition', 'attachment; filename="verification_scores.csv"')
    return c.body(csv)
  })
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}
