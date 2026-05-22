import type { SupabaseClient } from '@supabase/supabase-js'

export type CalibrationRow = {
  decisao: 'aprovado' | 'recusado' | 'requer_declaracao' | string
  motivo: string | null
  anti_spoof_score: number
  liveness_score: number
  composite_score: number
}

export type FetchOpts = { since: string; until: string }
export type FetchResult =
  | { ok: true; rows: CalibrationRow[] }
  | { ok: false; error: 'overflow' | 'supabase'; message?: string }

const ROW_CAP = 50000
const FETCH_LIMIT = ROW_CAP + 1

export async function fetchCalibrationRows(
  supabase: SupabaseClient,
  opts: FetchOpts,
): Promise<FetchResult> {
  const { data, error } = await supabase
    .from('verification_scores')
    .select('decisao,motivo,anti_spoof_score,liveness_score,composite_score')
    .gte('created_at', opts.since)
    .lte('created_at', opts.until)
    .order('created_at', { ascending: false })
    .limit(FETCH_LIMIT)
  if (error) return { ok: false, error: 'supabase', message: error.message }
  const rows = (data as CalibrationRow[] | null) ?? []
  if (rows.length > ROW_CAP) return { ok: false, error: 'overflow' }
  return { ok: true, rows }
}

export type ScoreStats = {
  mean: number | null
  p10: number | null
  p50: number | null
  p90: number | null
}

export type CalibrationAggregate = {
  window: { since: string; until: string }
  total: number
  by_decisao: Record<string, number>
  by_motivo: Record<string, number>
  scores: {
    antispoof: ScoreStats
    liveness: ScoreStats
    composite: ScoreStats
  }
  composite_shadow_divergence: {
    legacy_approves_composite_rejects: number
    legacy_rejects_composite_approves: number
  }
}

function statsFor(values: number[]): ScoreStats {
  if (values.length === 0) return { mean: null, p10: null, p50: null, p90: null }
  const sorted = [...values].sort((a, b) => a - b)
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length
  // Nearest-rank: idx = ceil(p * n) - 1, clamp em [0, n-1].
  // p=0 -> -1 -> clamp 0. p=1 -> n-1. n=2 e p=0.9 -> ceil(1.8)-1 = 1 (maior), correto.
  // O `floor(p*(n-1))` antigo dava idx=0 pra n=2 p=0.9 (errado pra nearest-rank).
  const at = (p: number) => {
    const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1))
    return sorted[idx]
  }
  return { mean, p10: at(0.1), p50: at(0.5), p90: at(0.9) }
}

function countBy<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  const m: Record<string, number> = {}
  for (const x of arr) {
    const k = key(x)
    m[k] = (m[k] ?? 0) + 1
  }
  return m
}

export type AggregateOpts = { since: string; until: string; compositeThreshold: number }

export function aggregateCalibration(rows: CalibrationRow[], opts: AggregateOpts): CalibrationAggregate {
  const total = rows.length
  const by_decisao = countBy(rows, (r) => r.decisao)
  const by_motivo = countBy(rows, (r) => r.motivo ?? 'aprovado')
  const scores = {
    antispoof: statsFor(rows.map((r) => r.anti_spoof_score)),
    liveness: statsFor(rows.map((r) => r.liveness_score)),
    composite: statsFor(rows.map((r) => r.composite_score)),
  }
  const th = opts.compositeThreshold
  const legacy_approves_composite_rejects = rows.filter(
    (r) => r.decisao === 'aprovado' && r.composite_score < th,
  ).length
  const legacy_rejects_composite_approves = rows.filter(
    (r) => r.decisao === 'recusado' && r.composite_score >= th,
  ).length
  return {
    window: { since: opts.since, until: opts.until },
    total,
    by_decisao,
    by_motivo,
    scores,
    composite_shadow_divergence: {
      legacy_approves_composite_rejects,
      legacy_rejects_composite_approves,
    },
  }
}
