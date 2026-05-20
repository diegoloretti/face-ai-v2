import { describe, it, expect } from 'vitest'
import {
  computeEAR,
  extractClientFeatures,
  createBlinkDetector,
  buildEyeEARPoints,
} from './humanDetect'

describe('computeEAR', () => {
  it('retorna ~0.30 para olho aberto (landmarks típicos)', () => {
    const open = [
      [0, 0],
      [2, -1],
      [4, -1],
      [6, 0],
      [4, 1],
      [2, 1],
    ] as [number, number][]
    expect(computeEAR(open)).toBeCloseTo(1 / 3, 1)
  })

  it('retorna ~0.05 para olho fechado (eixo vertical colapsado)', () => {
    const closed = [
      [0, 0],
      [2, -0.05],
      [4, -0.05],
      [6, 0],
      [4, 0.05],
      [2, 0.05],
    ] as [number, number][]
    expect(computeEAR(closed)).toBeLessThan(0.1)
  })

  it('lança se receber menos de 6 pontos', () => {
    expect(() => computeEAR([[0, 0]] as [number, number][])).toThrow()
  })
})

describe('extractClientFeatures', () => {
  it('extrai apenas os 4 campos necessários (sem gender, sem emotion)', () => {
    const humanResult = {
      face: [
        {
          age: 27.3,
          real: 0.92,
          live: 0.88,
          score: 0.99,
          gender: 'female',
          emotion: [{ score: 0.9, emotion: 'happy' }],
        },
      ],
    }
    const features = extractClientFeatures(humanResult)
    expect(features).toEqual({
      age: 27.3,
      antiSpoofScore: 0.92,
      livenessScore: 0.88,
      faceDetectionScore: 0.99,
    })
    expect(features).not.toHaveProperty('gender')
    expect(features).not.toHaveProperty('emotion')
  })

  it('lança erro NO_FACE se faces array vazio', () => {
    expect(() => extractClientFeatures({ face: [] })).toThrow('NO_FACE')
  })

  it('lança erro MULTIPLE_FACES se mais de 1 face', () => {
    expect(() => extractClientFeatures({ face: [{ age: 25 }, { age: 30 }] })).toThrow(
      'MULTIPLE_FACES',
    )
  })

  it('lança NO_FACE se age vem undefined (description não rodou)', () => {
    expect(() => extractClientFeatures({ face: [{ real: 0.9, live: 0.9, score: 0.99 }] })).toThrow(
      'NO_FACE',
    )
  })

  it('default 0 para real/live/score ausentes', () => {
    const features = extractClientFeatures({ face: [{ age: 30 }] })
    expect(features).toEqual({
      age: 30,
      antiSpoofScore: 0,
      livenessScore: 0,
      faceDetectionScore: 0,
    })
  })
})

describe('buildEyeEARPoints', () => {
  const upper = [
    [0, 0],
    [1, -1],
    [2, -2],
    [3, -2],
    [4, -2],
    [5, -1],
    [6, 0],
  ] as [number, number][]
  const lower = [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 1],
    [6, 0],
  ] as [number, number][]

  it('retorna 6 pontos quando upper e lower têm tamanho suficiente', () => {
    const pts = buildEyeEARPoints(upper, lower)
    expect(pts).not.toBeNull()
    expect(pts).toHaveLength(6)
  })

  it('p1 é o primeiro ponto do upper (canto esquerdo do olho)', () => {
    const pts = buildEyeEARPoints(upper, lower)!
    expect(pts[0]).toEqual([0, 0])
  })

  it('p4 é o último ponto do upper (canto direito do olho)', () => {
    const pts = buildEyeEARPoints(upper, lower)!
    expect(pts[3]).toEqual([6, 0])
  })

  it('retorna null se upper tem menos de 5 pontos', () => {
    const pts = buildEyeEARPoints(
      [
        [0, 0],
        [1, 1],
      ],
      lower,
    )
    expect(pts).toBeNull()
  })

  it('retorna null se lower tem menos de 5 pontos', () => {
    const pts = buildEyeEARPoints(upper, [
      [0, 0],
      [1, 1],
    ])
    expect(pts).toBeNull()
  })

  it('pontos resultantes alimentam computeEAR sem erro', () => {
    const pts = buildEyeEARPoints(upper, lower)!
    const ear = computeEAR(pts)
    expect(ear).toBeGreaterThan(0)
    expect(Number.isFinite(ear)).toBe(true)
  })
})

describe('createBlinkDetector', () => {
  it('inicia com 0 blinks e estado open', () => {
    const det = createBlinkDetector()
    expect(det.getCount()).toBe(0)
    expect(det.getEyeState()).toBe('open')
  })

  it('conta 1 blink após sequência open -> closed -> open', () => {
    const det = createBlinkDetector()
    det.processFrame(0.35, 0.35, 0)
    det.processFrame(0.1, 0.1, 100)
    det.processFrame(0.35, 0.35, 200)
    expect(det.getCount()).toBe(1)
  })

  it('debounce de 500ms impede contar 2 blinks consecutivos rápido demais', () => {
    const det = createBlinkDetector()
    det.processFrame(0.35, 0.35, 0)
    det.processFrame(0.1, 0.1, 100)
    det.processFrame(0.35, 0.35, 200)
    det.processFrame(0.1, 0.1, 300)
    det.processFrame(0.35, 0.35, 400)
    expect(det.getCount()).toBe(1)
  })

  it('conta 2 blinks com janela > 500ms entre eles', () => {
    const det = createBlinkDetector()
    det.processFrame(0.35, 0.35, 0)
    det.processFrame(0.1, 0.1, 100)
    det.processFrame(0.35, 0.35, 200)
    det.processFrame(0.35, 0.35, 800)
    det.processFrame(0.1, 0.1, 900)
    det.processFrame(0.35, 0.35, 1000)
    expect(det.getCount()).toBe(2)
  })

  it('só conta blink se AMBOS olhos fecharem (anti-winking)', () => {
    const det = createBlinkDetector()
    det.processFrame(0.35, 0.35, 0)
    det.processFrame(0.1, 0.35, 100)
    det.processFrame(0.35, 0.35, 200)
    expect(det.getCount()).toBe(0)
  })
})
