import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { mountMetricsCalibration } from './metricsCalibration.js'

function makeLogger() {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

const STRONG_TOKEN = 'a'.repeat(40)

function makeSupabaseWithRows(rows: Array<Record<string, unknown>>) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
            }),
          }),
        }),
      }),
    }),
  } as never
}

function makeDeps(over: Partial<Parameters<typeof mountMetricsCalibration>[1]> = {}) {
  return {
    adminToken: STRONG_TOKEN,
    supabase: makeSupabaseWithRows([]) as never,
    logger: makeLogger(),
    compositeThreshold: 0.78,
    ...over,
  }
}

describe('mountMetricsCalibration', () => {
  it('sem ADMIN_METRICS_TOKEN: rota não registrada (404)', async () => {
    const app = new Hono()
    mountMetricsCalibration(app, makeDeps({ adminToken: undefined }))
    const res = await app.request('/metrics/calibration')
    expect(res.status).toBe(404)
  })

  it('sem header x-admin-token: 401', async () => {
    const app = new Hono()
    mountMetricsCalibration(app, makeDeps())
    const res = await app.request('/metrics/calibration')
    expect(res.status).toBe(401)
  })

  it('header errado: 401', async () => {
    const app = new Hono()
    mountMetricsCalibration(app, makeDeps())
    const res = await app.request('/metrics/calibration', { headers: { 'x-admin-token': 'wrong' } })
    expect(res.status).toBe(401)
  })

  it('token correto, janela vazia: 200 com total=0', async () => {
    const app = new Hono()
    mountMetricsCalibration(app, makeDeps())
    const res = await app.request('/metrics/calibration', { headers: { 'x-admin-token': STRONG_TOKEN } })
    expect(res.status).toBe(200)
    const j = await res.json() as { total: number; scores: { antispoof: { p50: unknown } } }
    expect(j.total).toBe(0)
    expect(j.scores.antispoof.p50).toBeNull()
  })

  it('?since mais antigo que 90d: 400', async () => {
    const app = new Hono()
    mountMetricsCalibration(app, makeDeps())
    const since = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString()
    const res = await app.request(`/metrics/calibration?since=${encodeURIComponent(since)}`, {
      headers: { 'x-admin-token': STRONG_TOKEN },
    })
    expect(res.status).toBe(400)
    const j = await res.json() as { error: string; message: string }
    expect(j.error).toBe('window_too_old')
    expect(j.message).toMatch(/90 days/)
  })

  it('?since em formato inválido: 400', async () => {
    const app = new Hono()
    mountMetricsCalibration(app, makeDeps())
    const res = await app.request('/metrics/calibration?since=not-a-date', {
      headers: { 'x-admin-token': STRONG_TOKEN },
    })
    expect(res.status).toBe(400)
  })

  it('?until antes de since: 400', async () => {
    const app = new Hono()
    mountMetricsCalibration(app, makeDeps())
    const since = new Date().toISOString()
    const until = new Date(Date.now() - 1000).toISOString()
    const res = await app.request(
      `/metrics/calibration?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`,
      { headers: { 'x-admin-token': STRONG_TOKEN } },
    )
    expect(res.status).toBe(400)
  })

  it('rows > 50000: 413', async () => {
    const rows = Array.from({ length: 50001 }, () => ({
      decisao: 'aprovado', motivo: null,
      anti_spoof_score: 0.9, liveness_score: 0.85, composite_score: 0.88,
    }))
    const app = new Hono()
    mountMetricsCalibration(app, makeDeps({ supabase: makeSupabaseWithRows(rows) as never }))
    const res = await app.request('/metrics/calibration', { headers: { 'x-admin-token': STRONG_TOKEN } })
    expect(res.status).toBe(413)
    const j = await res.json() as { error: string }
    expect(j.error).toBe('window_too_large')
  })

  it('1 row: 200 com shape correto', async () => {
    const app = new Hono()
    mountMetricsCalibration(app, makeDeps({
      supabase: makeSupabaseWithRows([
        { decisao: 'recusado', motivo: 'antispoof_fail', anti_spoof_score: 0.7, liveness_score: 0.85, composite_score: 0.72 },
      ]) as never,
    }))
    const res = await app.request('/metrics/calibration', { headers: { 'x-admin-token': STRONG_TOKEN } })
    expect(res.status).toBe(200)
    const j = await res.json() as {
      total: number
      by_decisao: Record<string, number>
      by_motivo: Record<string, number>
      scores: { antispoof: { p50: number } }
      composite_shadow_divergence: unknown
    }
    expect(j.total).toBe(1)
    expect(j.by_decisao).toEqual({ recusado: 1 })
    expect(j.by_motivo).toEqual({ antispoof_fail: 1 })
    expect(j.scores.antispoof.p50).toBeCloseTo(0.7, 5)
    expect(j.composite_shadow_divergence).toBeDefined()
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-type')).toMatch(/application\/json/)
  })

  it('supabase error: 500', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
              }),
            }),
          }),
        }),
      }),
    } as never
    const app = new Hono()
    mountMetricsCalibration(app, makeDeps({ supabase }))
    const res = await app.request('/metrics/calibration', { headers: { 'x-admin-token': STRONG_TOKEN } })
    expect(res.status).toBe(500)
  })
})
