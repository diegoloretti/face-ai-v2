#!/usr/bin/env node
// Probe sintético pro /verify - mede latência end-to-end com payload realista.
// Uso: node scripts/perf-probe-verify.mjs <count> [base_url]
import { performance } from 'node:perf_hooks'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const count = Number(process.argv[2] ?? 10)
const baseUrl = process.argv[3] ?? 'https://face-ai-v2.fly.dev'

const fixturePath = path.join(__dirname, '..', 'apps/api/src/services/__fixtures__/face.b64')
let imageB64
if (fs.existsSync(fixturePath)) {
  imageB64 = fs.readFileSync(fixturePath, 'utf8').trim()
} else {
  imageB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII='
}

const latencies = []
for (let i = 0; i < count; i++) {
  const sessionId = `probe-${Date.now()}-${i}`
  const t0 = performance.now()
  const res = await fetch(`${baseUrl}/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId, image: imageB64 }),
  })
  await res.text()
  const dt = performance.now() - t0
  latencies.push(dt)
  console.log(`probe ${i + 1}/${count}: ${res.status} ${Math.round(dt)}ms`)
  await new Promise((r) => setTimeout(r, 500))
}

latencies.sort((a, b) => a - b)
const p = (q) => latencies[Math.floor(q * (latencies.length - 1))]
console.log(JSON.stringify({
  count: latencies.length,
  min: Math.round(latencies[0]),
  p50: Math.round(p(0.5)),
  p95: Math.round(p(0.95)),
  max: Math.round(latencies[latencies.length - 1]),
}, null, 2))
