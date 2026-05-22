import type { ClientFeatures } from '@face-ai/shared'

const EAR_FALLBACK_THRESHOLD = 0.2
const BLINK_DEBOUNCE_MS = 500
const DEFAULT_RATIO_CLOSED = 0.7
const DEFAULT_RATIO_OPEN = 0.85
const VALLEY_RATIO_CLOSED = 0.78
const VALLEY_RATIO_OPEN = 0.88
const VALLEY_HISTORY_SIZE = 5
const WINK_ASYMMETRY_LIMIT = 2.0
const MIN_EYE_FLOOR = 0.001

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
    lower[Math.floor(l * 0.3)],
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
    faceDetectionScore: f.score ?? 0,
    blinkDetected: false,
  }
}

export type EyeState = 'open' | 'closed'

export interface BlinkDetector {
  processFrame: (leftEAR: number, rightEAR: number, timestamp: number) => void
  getCount: () => number
  getEyeState: () => EyeState
  getThresholds: () => { closed: number; open: number; baseline: number | null }
  reset: () => void
}

/**
 * Opções do detector. Sem opções, cai num threshold absoluto de 0.20 (lógica
 * antiga do paper Soukupová & Čech 2016 - serve como fallback se a calibração
 * falhar).
 *
 * Com `baseline` (EAR aberto médio coletado nos primeiros frames da pessoa),
 * o detector vira person-relative: considera fechado quando a média dos dois
 * olhos cai abaixo de `baseline * ratioClosed` (default 0.7, i.e. 30% de queda
 * do EAR aberto). Isso resolve geometria de olho diferente entre pessoas.
 */
export interface BlinkDetectorOptions {
  baseline?: number
  ratioClosed?: number
  ratioOpen?: number
  fallbackThreshold?: number
}

export function createBlinkDetector(opts: BlinkDetectorOptions = {}): BlinkDetector {
  const baseline = opts.baseline ?? null
  const ratioClosed = opts.ratioClosed ?? DEFAULT_RATIO_CLOSED
  const ratioOpen = opts.ratioOpen ?? DEFAULT_RATIO_OPEN
  const fallback = opts.fallbackThreshold ?? EAR_FALLBACK_THRESHOLD
  const closedThreshold = baseline !== null ? baseline * ratioClosed : fallback
  const openThreshold = baseline !== null ? baseline * ratioOpen : fallback
  const valleyClosedThreshold = baseline !== null ? baseline * VALLEY_RATIO_CLOSED : null
  const valleyOpenThreshold = baseline !== null ? baseline * VALLEY_RATIO_OPEN : null

  let count = 0
  let eyeState: EyeState = 'open'
  let lastBlinkTimestamp = -Infinity
  let history: Array<{ avg: number; timestamp: number }> = []

  function registerBlink(timestamp: number) {
    if (timestamp - lastBlinkTimestamp < BLINK_DEBOUNCE_MS) return false
    count += 1
    lastBlinkTimestamp = timestamp
    return true
  }

  function detectValley(currentTimestamp: number): boolean {
    // Detecção por vale: olha a trajetória das últimas amostras pra capturar
    // piscadas rápidas que entraram entre dois "olhares" do sampling. Requer
    // baseline calibrado (precisa do ratio relativo pra ser confiável).
    if (valleyClosedThreshold === null || valleyOpenThreshold === null) return false
    if (history.length < 3) return false
    const oldest = history[0]
    const newest = history[history.length - 1]
    const middle = history.slice(1, -1)
    const oldestOpen = oldest.avg >= valleyOpenThreshold
    const newestOpen = newest.avg >= valleyOpenThreshold
    const middleDipped = middle.some((f) => f.avg < valleyClosedThreshold)
    if (!oldestOpen || !newestOpen || !middleDipped) return false
    return registerBlink(currentTimestamp)
  }

  function processFrame(leftEAR: number, rightEAR: number, timestamp: number) {
    // Anti-winking: se a razão entre o olho mais aberto e o mais fechado for
    // grande demais, é wink (piscar de um olho só) - ignora o frame.
    const maxEye = Math.max(leftEAR, rightEAR)
    const minEye = Math.max(Math.min(leftEAR, rightEAR), MIN_EYE_FLOOR)
    if (maxEye / minEye > WINK_ASYMMETRY_LIMIT) return

    const avg = (leftEAR + rightEAR) / 2
    history.push({ avg, timestamp })
    if (history.length > VALLEY_HISTORY_SIZE) history.shift()

    const isClosed = avg < closedThreshold
    const isOpen = avg >= openThreshold

    // Critério A: state machine clássica (open -> closed -> open).
    if (eyeState === 'open' && isClosed) {
      eyeState = 'closed'
      return
    }
    if (eyeState === 'closed' && isOpen) {
      eyeState = 'open'
      if (registerBlink(timestamp)) {
        history = []
      }
      return
    }

    // Critério B: vale na trajetória recente. Pega piscadas rápidas onde
    // nenhum frame individual caiu claramente abaixo do closedThreshold (mas
    // o conjunto mostra subiu-mergulhou-subiu).
    if (eyeState === 'open' && detectValley(timestamp)) {
      history = []
    }
  }

  return {
    processFrame,
    getCount: () => count,
    getEyeState: () => eyeState,
    getThresholds: () => ({ closed: closedThreshold, open: openThreshold, baseline }),
    reset: () => {
      count = 0
      eyeState = 'open'
      lastBlinkTimestamp = -Infinity
      history = []
    },
  }
}

/**
 * Calcula baseline a partir de amostras do EAR médio. Usa a metade superior
 * das amostras ordenadas (descarta frames em que a pessoa pode ter piscado
 * durante a calibração).
 *
 * Retorna `null` se o baseline ficar abaixo de 0.25 (sinal de que algo está
 * errado - rosto fora do quadro, olho meio fechado, etc.) - o caller deve cair
 * no fallback fixo.
 */
export function calibrateBaseline(samples: number[]): number | null {
  if (samples.length < 3) return null
  const sorted = [...samples].sort((a, b) => b - a)
  const topHalf = sorted.slice(0, Math.max(3, Math.ceil(sorted.length / 2)))
  const baseline = topHalf.reduce((s, v) => s + v, 0) / topHalf.length
  if (baseline < 0.25) return null
  return baseline
}
