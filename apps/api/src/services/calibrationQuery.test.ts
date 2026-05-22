import { describe, it, expect, vi } from 'vitest'
import { aggregateCalibration, fetchCalibrationRows, type CalibrationRow } from './calibrationQuery.js'

function makeSupabaseWithRows(rows: CalibrationRow[]) {
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

function row(over: Partial<CalibrationRow> = {}): CalibrationRow {
  return {
    decisao: 'aprovado',
    motivo: null,
    anti_spoof_score: 0.9,
    liveness_score: 0.85,
    composite_score: 0.88,
    ...over,
  }
}

describe('aggregateCalibration', () => {
  it('janela vazia: total=0, percentis null', () => {
    const r = aggregateCalibration([], { since: '2026-01-01T00:00:00Z', until: '2026-02-01T00:00:00Z', compositeThreshold: 0.78 })
    expect(r.total).toBe(0)
    expect(r.by_decisao).toEqual({})
    expect(r.scores.antispoof.mean).toBeNull()
    expect(r.scores.antispoof.p50).toBeNull()
  })

  it('1 row: mean = valor, percentis = valor', () => {
    const r = aggregateCalibration([row({ anti_spoof_score: 0.7 })], { since: 's', until: 'u', compositeThreshold: 0.78 })
    expect(r.total).toBe(1)
    expect(r.scores.antispoof.mean).toBeCloseTo(0.7, 5)
    expect(r.scores.antispoof.p50).toBeCloseTo(0.7, 5)
    expect(r.scores.antispoof.p10).toBeCloseTo(0.7, 5)
    expect(r.scores.antispoof.p90).toBeCloseTo(0.7, 5)
  })

  it('agrega by_decisao e by_motivo', () => {
    const rows = [
      row({ decisao: 'aprovado', motivo: null }),
      row({ decisao: 'aprovado', motivo: null }),
      row({ decisao: 'recusado', motivo: 'antispoof_fail' }),
      row({ decisao: 'recusado', motivo: 'liveness_fail' }),
    ]
    const r = aggregateCalibration(rows, { since: 's', until: 'u', compositeThreshold: 0.78 })
    expect(r.by_decisao).toEqual({ aprovado: 2, recusado: 2 })
    expect(r.by_motivo).toEqual({ aprovado: 2, antispoof_fail: 1, liveness_fail: 1 })
  })

  it('percentile nearest-rank em n=10', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row({ anti_spoof_score: (i + 1) / 10 }))
    // sorted = [0.1, 0.2, ..., 1.0]
    // idx = ceil(p * 10) - 1
    // p10 = ceil(1.0) - 1 = 0 -> sorted[0] = 0.1
    // p50 = ceil(5.0) - 1 = 4 -> sorted[4] = 0.5
    // p90 = ceil(9.0) - 1 = 8 -> sorted[8] = 0.9
    const r = aggregateCalibration(rows, { since: 's', until: 'u', compositeThreshold: 0.78 })
    expect(r.scores.antispoof.p10).toBeCloseTo(0.1, 5)
    expect(r.scores.antispoof.p50).toBeCloseTo(0.5, 5)
    expect(r.scores.antispoof.p90).toBeCloseTo(0.9, 5)
    expect(r.scores.antispoof.mean).toBeCloseTo(0.55, 5)
  })

  it('percentile nearest-rank em n=2', () => {
    // sorted = [0.3, 0.7]
    // idx = ceil(p * 2) - 1, clamp em [0,1]
    // p10 = ceil(0.2)-1 = 0 -> 0.3
    // p50 = ceil(1.0)-1 = 0 -> 0.3
    // p90 = ceil(1.8)-1 = 1 -> 0.7  (gap dominante - antiga formula daria 0.3, errado)
    const rows = [row({ anti_spoof_score: 0.7 }), row({ anti_spoof_score: 0.3 })]
    const r = aggregateCalibration(rows, { since: 's', until: 'u', compositeThreshold: 0.78 })
    expect(r.scores.antispoof.p10).toBeCloseTo(0.3, 5)
    expect(r.scores.antispoof.p50).toBeCloseTo(0.3, 5)
    expect(r.scores.antispoof.p90).toBeCloseTo(0.7, 5)
  })

  it('composite_shadow_divergence conta corretamente', () => {
    const rows = [
      row({ decisao: 'aprovado', composite_score: 0.6 }),  // legacy approve, composite reject (0.6 < 0.78)
      row({ decisao: 'aprovado', composite_score: 0.9 }),  // agree
      row({ decisao: 'recusado', composite_score: 0.85 }), // legacy reject, composite approve
      row({ decisao: 'recusado', composite_score: 0.5 }),  // agree
      row({ decisao: 'requer_declaracao', composite_score: 0.5 }), // excluido da divergencia
    ]
    const r = aggregateCalibration(rows, { since: 's', until: 'u', compositeThreshold: 0.78 })
    expect(r.composite_shadow_divergence.legacy_approves_composite_rejects).toBe(1)
    expect(r.composite_shadow_divergence.legacy_rejects_composite_approves).toBe(1)
  })
})

describe('fetchCalibrationRows', () => {
  it('retorna { ok: true, rows } com supabase ok', async () => {
    const supabase = makeSupabaseWithRows([row()])
    const res = await fetchCalibrationRows(supabase, { since: '2026-01-01T00:00:00Z', until: '2026-02-01T00:00:00Z' })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.rows.length).toBe(1)
  })

  it('retorna { ok: false, error: "overflow" } quando rows > 50000', async () => {
    const rows = Array.from({ length: 50001 }, () => row())
    const supabase = makeSupabaseWithRows(rows)
    const res = await fetchCalibrationRows(supabase, { since: 's', until: 'u' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('overflow')
  })

  it('retorna { ok: false, error: "supabase" } quando supabase falha', async () => {
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
    const res = await fetchCalibrationRows(supabase, { since: 's', until: 'u' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('supabase')
  })
})
