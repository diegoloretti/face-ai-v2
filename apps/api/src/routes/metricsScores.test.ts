import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { mountMetricsScores } from './metricsScores.js'

function makeLogger() {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

function makeSupabaseWithRows(rows: Array<Record<string, unknown>>) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    }),
  }
}

const STRONG_TOKEN = 'a'.repeat(40)

describe('mountMetricsScores', () => {
  it('sem ADMIN_METRICS_TOKEN env: rota nao registrada, 404', async () => {
    const app = new Hono()
    mountMetricsScores(app, {
      adminToken: undefined,
      supabase: makeSupabaseWithRows([]) as never,
      logger: makeLogger(),
    })
    const res = await app.request('/metrics/scores')
    expect(res.status).toBe(404)
  })

  it('com env mas sem header x-admin-token: 401', async () => {
    const app = new Hono()
    mountMetricsScores(app, {
      adminToken: STRONG_TOKEN,
      supabase: makeSupabaseWithRows([]) as never,
      logger: makeLogger(),
    })
    const res = await app.request('/metrics/scores')
    expect(res.status).toBe(401)
  })

  it('com header errado: 401', async () => {
    const app = new Hono()
    mountMetricsScores(app, {
      adminToken: STRONG_TOKEN,
      supabase: makeSupabaseWithRows([]) as never,
      logger: makeLogger(),
    })
    const res = await app.request('/metrics/scores', {
      headers: { 'x-admin-token': 'wrong' },
    })
    expect(res.status).toBe(401)
  })

  it('com header correto e dados: 200 CSV', async () => {
    const app = new Hono()
    mountMetricsScores(app, {
      adminToken: STRONG_TOKEN,
      supabase: makeSupabaseWithRows([
        {
          created_at: '2026-05-21T10:00:00Z',
          decision_mode: 'legacy_and',
          session_id: 's1',
          age: 30,
          anti_spoof_score: 0.95,
          liveness_score: 0.9,
          face_detection_score: 0.99,
          composite_score: 0.82,
          blink_detected: false,
          failed_liveness: false,
          failed_antispoof: false,
          failed_composite_shadow: false,
          failed_blink: false,
          decisao: 'aprovado',
          motivo: null,
          faixa_etaria: '22+',
        },
      ]) as never,
      logger: makeLogger(),
    })
    const res = await app.request('/metrics/scores', {
      headers: { 'x-admin-token': STRONG_TOKEN },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.text()
    const lines = body.split('\n')
    expect(lines[0]).toMatch(/^created_at,decision_mode,session_id,/)
    expect(lines[1]).toContain('2026-05-21T10:00:00Z')
    expect(lines[1]).toContain('aprovado')
  })

  it('?limit=15000 -> 400', async () => {
    const app = new Hono()
    mountMetricsScores(app, {
      adminToken: STRONG_TOKEN,
      supabase: makeSupabaseWithRows([]) as never,
      logger: makeLogger(),
    })
    const res = await app.request('/metrics/scores?limit=15000', {
      headers: { 'x-admin-token': STRONG_TOKEN },
    })
    expect(res.status).toBe(400)
  })

  it('?limit=abc -> 400', async () => {
    const app = new Hono()
    mountMetricsScores(app, {
      adminToken: STRONG_TOKEN,
      supabase: makeSupabaseWithRows([]) as never,
      logger: makeLogger(),
    })
    const res = await app.request('/metrics/scores?limit=abc', {
      headers: { 'x-admin-token': STRONG_TOKEN },
    })
    expect(res.status).toBe(400)
  })

  it('escapa CSV com virgula nos valores', async () => {
    const app = new Hono()
    mountMetricsScores(app, {
      adminToken: STRONG_TOKEN,
      supabase: makeSupabaseWithRows([
        {
          created_at: '2026-05-21T10:00:00Z',
          decision_mode: 'legacy_and',
          session_id: 's1',
          age: 30,
          anti_spoof_score: 0.95,
          liveness_score: 0.9,
          face_detection_score: 0.99,
          composite_score: 0.82,
          blink_detected: false,
          failed_liveness: false,
          failed_antispoof: false,
          failed_composite_shadow: false,
          failed_blink: false,
          decisao: 'aprovado',
          motivo: 'has,comma',
          faixa_etaria: '22+',
        },
      ]) as never,
      logger: makeLogger(),
    })
    const res = await app.request('/metrics/scores', {
      headers: { 'x-admin-token': STRONG_TOKEN },
    })
    const body = await res.text()
    expect(body).toContain('"has,comma"')
  })
})
