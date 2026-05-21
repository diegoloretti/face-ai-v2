import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HttpError } from '../lib/errors.js'
import type { ServerFeatures } from './decisionEngine.js'
import type { Human as HumanType, Config } from '@vladmandic/human'

const here = dirname(fileURLToPath(import.meta.url))
const MODELS_DIR = resolve(here, '../../models')

const config: Partial<Config> = {
  backend: 'tensorflow',
  modelBasePath: `file://${MODELS_DIR}/`,
  cacheSensitivity: 0,
  filter: { enabled: false },
  face: {
    enabled: true,
    detector: { rotation: false, maxDetected: 5, return: false },
    description: { enabled: true },
    antispoof: { enabled: true },
    liveness: { enabled: true },
    iris: { enabled: true },
    mesh: { enabled: true },
    emotion: { enabled: false },
    gear: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
}

let singleton: Promise<HumanType> | null = null

export async function getHuman(): Promise<HumanType> {
  if (!singleton) {
    singleton = (async () => {
      // Lazy import: @vladmandic/human carrega tfjs-node nativamente ao importar.
      // Em dev Windows o binding não compilou - importar no topo trava o module load.
      // Em Docker/Fly o binding está presente e este import resolve normalmente.
      const { Human } = await import('@vladmandic/human')
      const h = new Human(config)
      await h.load()
      await h.warmup()
      return h
    })().catch((err) => {
      singleton = null
      throw err
    })
  }
  return singleton
}

export async function extractServerFeatures(photoBuf: Buffer): Promise<ServerFeatures> {
  // Lazy import: tfjs-node native binding pode estar ausente em dev (Windows).
  // Em Docker/Fly o binding está presente e este import resolve normalmente.
  const tf = await import('@tensorflow/tfjs-node')
  const human = await getHuman()
  // decodeImage com channels=3 sempre retorna Tensor3D
  const tensor = tf.node.decodeImage(photoBuf, 3)
  try {
    const result = await human.detect(tensor)
    if (result.face.length === 0) {
      throw new HttpError(422, 'no_face')
    }
    if (result.face.length > 1) {
      throw new HttpError(422, 'multiple_faces')
    }
    const f = result.face[0]
    if (typeof f.age !== 'number') {
      throw new HttpError(422, 'no_face', { reason: 'age_missing' })
    }
    return {
      age: f.age,
      antiSpoofScore: typeof f.real === 'number' ? f.real : 0,
      livenessScore: typeof f.live === 'number' ? f.live : 0,
      faceDetectionScore: typeof f.score === 'number' ? f.score : 0,
    }
  } finally {
    tensor.dispose()
  }
}
