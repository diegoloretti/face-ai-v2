import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { getHuman, extractServerFeatures } from './humanRunner.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixturePath = resolve(here, '../../test/fixtures/face-real.jpg')

const hasFixture = existsSync(fixturePath)
// tfjs-node prebuilt binding não suporta Windows; integração roda em Linux/Docker/CI.
const canRunNative = process.platform !== 'win32'

describe.runIf(hasFixture && canRunNative)('humanRunner integration', () => {
  let buffer: Buffer

  beforeAll(async () => {
    buffer = await readFile(fixturePath)
  }, 60000)

  it('carrega Human singleton e detecta face na fixture', async () => {
    const human = await getHuman()
    expect(human).toBeDefined()
    const features = await extractServerFeatures(buffer)
    expect(features.age).toBeGreaterThan(0)
    expect(features.faceDetectionScore).toBeGreaterThan(0)
    expect(features.livenessScore).toBeGreaterThanOrEqual(0)
    expect(features.antiSpoofScore).toBeGreaterThanOrEqual(0)
  }, 60000)

  it('chamadas subsequentes reutilizam a mesma instância', async () => {
    const a = await getHuman()
    const b = await getHuman()
    expect(a).toBe(b)
  }, 60000)
})
