import type { ClientFeatures } from '@face-ai/shared'

const EAR_CLOSED_THRESHOLD = 0.2
const BLINK_DEBOUNCE_MS = 500

type Point = [number, number]

function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

export function computeEAR(landmarks: Point[]): number {
  if (landmarks.length < 6) {
    throw new Error('computeEAR requires 6 landmarks')
  }
  const [p1, p2, p3, p4, p5, p6] = landmarks
  return (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4))
}

/**
 * Adapta contornos `leftEyeUpper0`/`leftEyeLower0` (e equivalente direito) do
 * Human facemesh em 6 pontos no formato esperado por `computeEAR`.
 *
 * Mapeamento:
 *   p1 = primeiro ponto do upper (canto interno do olho)
 *   p4 = último ponto do upper (canto externo)
 *   p2, p3 = ~30% e ~70% do upper (duas amostras superiores)
 *   p5, p6 = ~70% e ~30% do lower (duas amostras inferiores)
 *
 * Retorna null se upper ou lower têm menos de 5 pontos (Human pode entregar
 * frames parciais; o caller deve tentar de novo no próximo tick).
 */
export function buildEyeEARPoints(upper: Point[], lower: Point[]): Point[] | null {
  if (upper.length < 5 || lower.length < 5) return null
  const u = upper.length
  const l = lower.length
  return [
    upper[0],
    upper[Math.floor(u * 0.3)],
    upper[Math.floor(u * 0.7)],
    upper[u - 1],
    lower[Math.floor(l * 0.7)],
    lower[Math.floor(l * 0.3)]
  ]
}

interface HumanFaceMinimal {
  age?: number
  real?: number
  live?: number
  score?: number
}

interface HumanResultMinimal {
  face: HumanFaceMinimal[]
}

export function extractClientFeatures(result: HumanResultMinimal): ClientFeatures {
  if (!result.face || result.face.length === 0) {
    throw new Error('NO_FACE')
  }
  if (result.face.length > 1) {
    throw new Error('MULTIPLE_FACES')
  }
  const f = result.face[0]
  // age vindo undefined significa que o description (FaceRes) não rodou - trata como NO_FACE
  // pra evitar enviar lixo pro decision engine.
  if (typeof f.age !== 'number') {
    throw new Error('NO_FACE')
  }
  // real/live podem ser undefined quando Human descarta scores zerados.
  // Default 0 = pior caso (recusa imediata pelos thresholds), que é o comportamento seguro.
  return {
    age: f.age,
    antiSpoofScore: f.real ?? 0,
    livenessScore: f.live ?? 0,
    faceDetectionScore: f.score ?? 0
  }
}

export type EyeState = 'open' | 'closed'

export interface BlinkDetector {
  processFrame: (leftEAR: number, rightEAR: number, timestamp: number) => void
  getCount: () => number
  getEyeState: () => EyeState
  reset: () => void
}

export function createBlinkDetector(): BlinkDetector {
  let count = 0
  let eyeState: EyeState = 'open'
  let lastBlinkTimestamp = -Infinity

  function processFrame(leftEAR: number, rightEAR: number, timestamp: number) {
    const bothClosed =
      leftEAR < EAR_CLOSED_THRESHOLD && rightEAR < EAR_CLOSED_THRESHOLD
    const bothOpen =
      leftEAR >= EAR_CLOSED_THRESHOLD && rightEAR >= EAR_CLOSED_THRESHOLD

    if (eyeState === 'open' && bothClosed) {
      eyeState = 'closed'
      return
    }
    if (eyeState === 'closed' && bothOpen) {
      eyeState = 'open'
      if (timestamp - lastBlinkTimestamp >= BLINK_DEBOUNCE_MS) {
        count += 1
        lastBlinkTimestamp = timestamp
      }
    }
  }

  return {
    processFrame,
    getCount: () => count,
    getEyeState: () => eyeState,
    reset: () => {
      count = 0
      eyeState = 'open'
      lastBlinkTimestamp = -Infinity
    }
  }
}
