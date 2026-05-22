#!/usr/bin/env node
// Popula `verification_scores` com N rows sintéticas pra perf-testar /metrics/calibration localmente.
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-verification-scores.mjs 1000
//
// IMPORTANTE: exige Supabase BRANCH (criar via MCP `create_branch`), nunca prod.
// Hard guard recusa rodar se a URL contém o project ref de prod.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}

const PROD_REFS = ['fwtguovxmnbvcjqwmkxd']
for (const ref of PROD_REFS) {
  if (url.includes(ref)) {
    console.error(`refusing to seed against prod project ref ${ref}. Create a Supabase branch first.`)
    process.exit(2)
  }
}

const supabase = createClient(url, key)
const n = Number(process.argv[2] ?? 1000)

const decisoes = ['aprovado', 'recusado', 'recusado', 'requer_declaracao']
const motivos = [null, 'antispoof_fail', 'liveness_fail', 'composite_fail', 'faixa_etaria_minor']

function rnd(min, max) { return Math.random() * (max - min) + min }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

const rows = Array.from({ length: n }, (_, i) => {
  const decisao = pick(decisoes)
  const motivo = decisao === 'aprovado' ? null : pick(motivos.filter((m) => m !== null))
  const antispoof = rnd(0.4, 1.0)
  const liveness = rnd(0.4, 1.0)
  const faceDet = rnd(0.5, 1.0)
  const composite = 0.4 * antispoof + 0.4 * liveness + 0.2 * faceDet
  const minutesAgo = Math.floor(Math.random() * 60 * 24 * 7)
  return {
    session_id: `seed-${Date.now()}-${i}`,
    age: Math.floor(rnd(16, 60)),
    anti_spoof_score: antispoof,
    liveness_score: liveness,
    face_detection_score: faceDet,
    composite_score: composite,
    blink_detected: Math.random() > 0.3,
    failed_liveness: liveness < 0.8,
    failed_antispoof: antispoof < 0.85,
    failed_composite_shadow: composite < 0.78,
    failed_blink: false,
    decisao,
    motivo,
    faixa_etaria: '22+',
    decision_mode: 'legacy_and',
    created_at: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
  }
})

const CHUNK = 500
for (let i = 0; i < rows.length; i += CHUNK) {
  const slice = rows.slice(i, i + CHUNK)
  const { error } = await supabase.from('verification_scores').insert(slice)
  if (error) {
    console.error('insert failed:', error.message)
    process.exit(1)
  }
  console.log(`inserted ${i + slice.length}/${rows.length}`)
}
console.log('done')
