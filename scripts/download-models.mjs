#!/usr/bin/env node
import { mkdir, writeFile, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const targetDir = join(__dirname, '..', 'apps', 'web', 'public', 'models')

// Modelos necessarios conforme spec secao 4.4 (config Human)
// Source: https://github.com/vladmandic/human-models/tree/main/models
const MODELS = [
  'blazeface.json',
  'blazeface.bin',
  'faceres.json',
  'faceres.bin',
  'antispoof.json',
  'antispoof.bin',
  'liveness.json',
  'liveness.bin',
  'iris.json',
  'iris.bin',
  'facemesh.json',
  'facemesh.bin',
]

const CDN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/models'
const FALLBACK_URL = 'https://github.com/vladmandic/human-models/raw/main/models'

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function downloadFrom(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function downloadOne(filename) {
  const dest = join(targetDir, filename)
  if (await fileExists(dest)) {
    console.log(`skip  ${filename} (already exists)`)
    return
  }

  const cdnUrl = `${CDN_URL}/${filename}`
  const fallbackUrl = `${FALLBACK_URL}/${filename}`

  let buf
  try {
    console.log(`fetch ${filename} <- ${cdnUrl}`)
    buf = await downloadFrom(cdnUrl)
  } catch (err) {
    console.warn(`CDN failed (${err.message}), trying fallback...`)
    console.log(`fetch ${filename} <- ${fallbackUrl}`)
    buf = await downloadFrom(fallbackUrl)
  }

  await writeFile(dest, buf)
  console.log(`done  ${filename} (${(buf.length / 1024).toFixed(1)} KB)`)
}

async function main() {
  await mkdir(targetDir, { recursive: true })
  console.log(`target: ${targetDir}\n`)
  for (const m of MODELS) {
    try {
      await downloadOne(m)
    } catch (err) {
      console.error(`FAIL  ${m}: ${err.message}`)
      process.exitCode = 1
    }
  }
}

main()
