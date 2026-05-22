import { describe, it, expect } from 'vitest'
import {
  computeEAR,
  extractClientFeatures,
  createBlinkDetector,
  buildEyeEARPoints,
  calibrateBaseline,
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
      blinkDetected: false,
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
      blinkDetected: false,
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

  it('ignora frame com assimetria grande entre olhos (wink, não blink)', () => {
    const det = createBlinkDetector()
    det.processFrame(0.35, 0.35, 0)
    det.processFrame(0.1, 0.35, 100) // razão 3.5x, wink: frame ignorado
    det.processFrame(0.35, 0.35, 200)
    expect(det.getCount()).toBe(0)
  })

  it('com baseline calibrado, conta blink mesmo quando peak não cruza 0.20', () => {
    // Olho aberto ~0.37, blink natural só desce até 0.22.
    // Threshold absoluto 0.20 perdia, threshold relativo (0.37*0.7=0.259) pega.
    const det = createBlinkDetector({ baseline: 0.37 })
    det.processFrame(0.37, 0.37, 0)
    det.processFrame(0.22, 0.22, 100)
    det.processFrame(0.37, 0.37, 200)
    expect(det.getCount()).toBe(1)
  })

  it('com baseline, conta blink usando média quando um olho mal cruza', () => {
    // L=0.19 (cruza absoluto), R=0.21 (não cruza absoluto). Média = 0.20.
    // Com threshold relativo 0.259, média 0.20 cruza com folga.
    const det = createBlinkDetector({ baseline: 0.37 })
    det.processFrame(0.37, 0.37, 0)
    det.processFrame(0.19, 0.21, 100)
    det.processFrame(0.37, 0.37, 200)
    expect(det.getCount()).toBe(1)
  })

  it('com baseline, ainda rejeita wink (1 olho muito mais aberto que o outro)', () => {
    const det = createBlinkDetector({ baseline: 0.37 })
    det.processFrame(0.37, 0.37, 0)
    det.processFrame(0.05, 0.37, 100) // razão 7.4x, wink
    det.processFrame(0.37, 0.37, 200)
    expect(det.getCount()).toBe(0)
  })

  it('detecta piscada rápida via vale (frames intermediários sem cruzar closedThreshold limpo)', () => {
    // Caso piscada rápida: sampling não capturou peak fechado, mas a trajetória
    // mostra subiu-mergulhou-subiu. Baseline 0.40, closedThreshold = 0.28,
    // valleyClosedThreshold = 0.312. Os frames intermediários caem em 0.30
    // (cruzam valley mas não closed clássico).
    const det = createBlinkDetector({ baseline: 0.4 })
    det.processFrame(0.4, 0.4, 0) // aberto
    det.processFrame(0.3, 0.3, 80) // meio do mergulho (>0.28, não cruza clássico)
    det.processFrame(0.4, 0.4, 160) // voltou aberto
    expect(det.getCount()).toBe(1)
  })

  it('vale exige baseline calibrado (sem baseline, só state machine clássica)', () => {
    const det = createBlinkDetector()
    det.processFrame(0.4, 0.4, 0)
    det.processFrame(0.3, 0.3, 80) // não cruza 0.20 fallback
    det.processFrame(0.4, 0.4, 160)
    expect(det.getCount()).toBe(0)
  })

  it('vale não conta se o frame mais antigo não estava claramente aberto', () => {
    // Sem fase "olho aberto" inicial limpa, vale não confia que foi blink.
    // 0.32 está abaixo do valleyOpenThreshold (0.4*0.88=0.352) mas acima do
    // closedThreshold clássico (0.28) - state machine clássica também não
    // dispara. Resultado esperado: 0.
    const det = createBlinkDetector({ baseline: 0.4 })
    det.processFrame(0.32, 0.32, 0)
    det.processFrame(0.3, 0.3, 80)
    det.processFrame(0.4, 0.4, 160)
    expect(det.getCount()).toBe(0)
  })

  it('vale respeita debounce de 500ms', () => {
    const det = createBlinkDetector({ baseline: 0.4 })
    det.processFrame(0.4, 0.4, 0)
    det.processFrame(0.3, 0.3, 80)
    det.processFrame(0.4, 0.4, 160) // blink 1
    det.processFrame(0.3, 0.3, 240) // tenta novo, debounce bloqueia
    det.processFrame(0.4, 0.4, 320)
    expect(det.getCount()).toBe(1)
  })

  it('combina state machine clássica e vale sem contar duas vezes (debounce)', () => {
    const det = createBlinkDetector({ baseline: 0.4 })
    det.processFrame(0.4, 0.4, 0)
    det.processFrame(0.15, 0.15, 80) // cruza clássico E vale
    det.processFrame(0.4, 0.4, 160) // volta aberto, state machine conta
    expect(det.getCount()).toBe(1)
  })

  it('getThresholds expõe os limiares calculados', () => {
    const semBaseline = createBlinkDetector()
    expect(semBaseline.getThresholds()).toEqual({ closed: 0.2, open: 0.2, baseline: null })

    const comBaseline = createBlinkDetector({ baseline: 0.4 })
    const t = comBaseline.getThresholds()
    expect(t.baseline).toBe(0.4)
    expect(t.closed).toBeCloseTo(0.28, 5)
    expect(t.open).toBeCloseTo(0.34, 5)
  })
})

describe('calibrateBaseline', () => {
  it('retorna null com menos de 3 amostras', () => {
    expect(calibrateBaseline([0.4, 0.4])).toBeNull()
  })

  it('retorna null se baseline calculado < 0.25 (sinal de erro de captura)', () => {
    expect(calibrateBaseline([0.15, 0.16, 0.17, 0.18])).toBeNull()
  })

  it('calcula média da metade superior, ignora amostras baixas (frames piscando)', () => {
    // 8 amostras: 4 altas (olho aberto), 4 baixas (pessoa piscou durante calib)
    const samples = [0.4, 0.42, 0.39, 0.41, 0.15, 0.18, 0.2, 0.17]
    const baseline = calibrateBaseline(samples)
    expect(baseline).not.toBeNull()
    expect(baseline!).toBeCloseTo((0.4 + 0.42 + 0.39 + 0.41) / 4, 2)
  })

  it('aceita amostras consistentemente altas', () => {
    const baseline = calibrateBaseline([0.38, 0.39, 0.37, 0.4, 0.36, 0.38])
    expect(baseline).not.toBeNull()
    expect(baseline!).toBeGreaterThan(0.35)
  })
})
