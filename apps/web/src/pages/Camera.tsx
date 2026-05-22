import { useEffect, useRef, useState, useMemo } from 'react'
import type { ClientFeatures, VerifyResponse } from '@face-ai/shared'
import { CameraView } from '../components/CameraView'
import { BlinkChallenge, type BlinkChallengeStatus } from '../components/BlinkChallenge'
import { StatusBadge } from '../components/StatusBadge'
import { useCamera } from '../hooks/useCamera'
import { useHuman } from '../hooks/useHuman'
import {
  buildEyeEARPoints,
  calibrateBaseline,
  computeEAR,
  createBlinkDetector,
  extractClientFeatures,
} from '../services/humanDetect'
import { verify, cannedVerifyResponse, getMockDecisionOverride } from '../services/api'
import { mapErrorToMessage } from '../lib/errors'
import { env } from '../env'

const REQUIRED_BLINKS = env.VITE_REQUIRE_BLINK ? 2 : 0
const BLINK_TIMEOUT_MS = 10000
const DETECT_INTERVAL_MS = 100
const MOCK_SHORTCUT_DELAY_MS = 800
const CALIBRATION_MIN_MS = 800
const CALIBRATION_MAX_MS = 2000
const CALIBRATION_MIN_SAMPLES = 6

type Point = [number, number]

function toPoints2D(landmarks: unknown): Point[] | null {
  if (!Array.isArray(landmarks) || landmarks.length === 0) return null
  const points: Point[] = []
  for (const p of landmarks) {
    if (!Array.isArray(p) || typeof p[0] !== 'number' || typeof p[1] !== 'number') {
      return null
    }
    points.push([p[0], p[1]])
  }
  return points
}

export function Camera({
  sessionId,
  local,
  onResponse,
}: {
  sessionId: string
  local: string
  onResponse: (r: VerifyResponse) => void
}) {
  const mockOverride = useMemo(() => (env.VITE_USE_MOCK_API ? getMockDecisionOverride() : null), [])
  const realPipelineEnabled = mockOverride === null
  const debugEAR = useMemo(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('debug-ear'),
    [],
  )

  const { stream, error: cameraError } = useCamera(realPipelineEnabled)
  const { human, error: humanError } = useHuman(realPipelineEnabled)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const detectorRef = useRef(createBlinkDetector())
  const calibrationSamplesRef = useRef<number[]>([])
  const calibrationPhaseRef = useRef<'collecting' | 'ready'>('collecting')
  const debugRangeRef = useRef({ leftMin: 1, leftMax: 0, rightMin: 1, rightMax: 0, frames: 0 })
  const [blinkCount, setBlinkCount] = useState(0)
  const [blinkStatus, setBlinkStatus] = useState<BlinkChallengeStatus>('waiting')
  const [statusMsg, setStatusMsg] = useState(
    mockOverride ? `Modo demo: decisão "${mockOverride}"` : 'Aguardando câmera...',
  )
  const [capturing, setCapturing] = useState(false)
  const [debugStats, setDebugStats] = useState<{
    leftEAR: number
    rightEAR: number
    leftMin: number
    leftMax: number
    rightMin: number
    rightMax: number
    eyeState: 'open' | 'closed'
    count: number
    frames: number
    phase: 'collecting' | 'ready'
    baseline: number | null
    thresholdClosed: number
  } | null>(null)

  useEffect(() => {
    performance.mark('flow-camera-mount')
  }, [])

  useEffect(() => {
    if (!mockOverride) return
    const timer = setTimeout(() => {
      onResponse(cannedVerifyResponse(mockOverride, sessionId))
    }, MOCK_SHORTCUT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [mockOverride, sessionId, onResponse])

  useEffect(() => {
    if (!realPipelineEnabled) return
    if (!stream || !human || blinkStatus !== 'waiting') return
    // Plano 5: pular gate quando blink desligado via env (mantem telemetria coletando blinkCount=0).
    if (REQUIRED_BLINKS === 0) {
      setBlinkStatus('complete')
      setStatusMsg('Centralize seu rosto e tire a foto.')
      return
    }
    setStatusMsg('Calibrando, olhe pra câmera com os olhos abertos...')
    calibrationSamplesRef.current = []
    calibrationPhaseRef.current = 'collecting'
    detectorRef.current = createBlinkDetector()
    const startedAt = performance.now()
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      const now = performance.now()
      const elapsed = now - startedAt
      if (!debugEAR && elapsed > BLINK_TIMEOUT_MS) {
        setBlinkStatus('timeout')
        return
      }
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        setTimeout(tick, DETECT_INTERVAL_MS)
        return
      }
      try {
        const result = await human.detect(video)
        const face = result.face?.[0]
        const leftUpper = toPoints2D(face?.annotations?.leftEyeUpper0)
        const leftLower = toPoints2D(face?.annotations?.leftEyeLower0)
        const rightUpper = toPoints2D(face?.annotations?.rightEyeUpper0)
        const rightLower = toPoints2D(face?.annotations?.rightEyeLower0)
        if (leftUpper && leftLower && rightUpper && rightLower) {
          const leftPts = buildEyeEARPoints(leftUpper, leftLower)
          const rightPts = buildEyeEARPoints(rightUpper, rightLower)
          if (leftPts && rightPts) {
            const leftEAR = computeEAR(leftPts)
            const rightEAR = computeEAR(rightPts)
            const avg = (leftEAR + rightEAR) / 2

            if (calibrationPhaseRef.current === 'collecting') {
              calibrationSamplesRef.current.push(avg)
              const enoughSamples =
                calibrationSamplesRef.current.length >= CALIBRATION_MIN_SAMPLES
              const minTimeReached = elapsed >= CALIBRATION_MIN_MS
              const maxTimeReached = elapsed >= CALIBRATION_MAX_MS
              if ((enoughSamples && minTimeReached) || maxTimeReached) {
                const baseline = calibrateBaseline(calibrationSamplesRef.current)
                detectorRef.current = createBlinkDetector(
                  baseline !== null ? { baseline } : {},
                )
                calibrationPhaseRef.current = 'ready'
                setStatusMsg('Pisque duas vezes para confirmar.')
              }
            } else {
              detectorRef.current.processFrame(leftEAR, rightEAR, now)
            }

            const count = detectorRef.current.getCount()
            setBlinkCount(count)

            if (debugEAR) {
              const range = debugRangeRef.current
              range.leftMin = Math.min(range.leftMin, leftEAR)
              range.leftMax = Math.max(range.leftMax, leftEAR)
              range.rightMin = Math.min(range.rightMin, rightEAR)
              range.rightMax = Math.max(range.rightMax, rightEAR)
              range.frames += 1
              const thresholds = detectorRef.current.getThresholds()
              setDebugStats({
                leftEAR,
                rightEAR,
                leftMin: range.leftMin,
                leftMax: range.leftMax,
                rightMin: range.rightMin,
                rightMax: range.rightMax,
                eyeState: detectorRef.current.getEyeState(),
                count,
                frames: range.frames,
                phase: calibrationPhaseRef.current,
                baseline: thresholds.baseline,
                thresholdClosed: thresholds.closed,
              })
            }

            if (
              !debugEAR &&
              calibrationPhaseRef.current === 'ready' &&
              count >= REQUIRED_BLINKS
            ) {
              setBlinkStatus('complete')
              setStatusMsg('Presença confirmada. Centralize seu rosto e tire a foto.')
              return
            }
          }
        }
      } catch (err) {
        setStatusMsg(mapErrorToMessage(err))
      }
      setTimeout(tick, DETECT_INTERVAL_MS)
    }

    tick()
    return () => {
      cancelled = true
    }
  }, [realPipelineEnabled, stream, human, blinkStatus, debugEAR])

  async function handleCapture() {
    const video = videoRef.current
    if (!video || !human || capturing) return
    setCapturing(true)
    setStatusMsg('Analisando...')
    performance.mark('flow-capture-start')
    try {
      const result = await human.detect(video)
      const baseFeatures = extractClientFeatures(result)
      const features: ClientFeatures = {
        ...baseFeatures,
        blinkDetected: blinkCount > 0,
      }
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.scale(-1, 1)
      ctx.drawImage(video, -canvas.width, 0)
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/jpeg',
          0.9,
        ),
      )
      const response = await verify(blob, features, sessionId, local)
      performance.mark('flow-verify-response')
      try {
        performance.measure('flow-total', 'flow-start', 'flow-verify-response')
        performance.measure('flow-camera-to-response', 'flow-camera-mount', 'flow-verify-response')
        performance.measure('flow-capture-to-response', 'flow-capture-start', 'flow-verify-response')
        const measures = performance
          .getEntriesByType('measure')
          .filter((m) => m.name.startsWith('flow-'))
        console.log(
          '[perf-flow]',
          JSON.stringify(measures.map((m) => ({ name: m.name, ms: Math.round(m.duration) }))),
        )
      } catch {
        // performance.measure throws if a mark is absent (e.g. direct entry into Camera without Consent).
        // Silent on purpose: instrumentation is best-effort.
      }
      onResponse(response)
    } catch (err) {
      setStatusMsg(mapErrorToMessage(err))
      setCapturing(false)
    }
  }

  const fatalError = cameraError ?? humanError
  if (fatalError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <StatusBadge tone="error">Erro</StatusBadge>
        <p className="font-mono text-sm text-accent-pink">{mapErrorToMessage(fatalError)}</p>
      </main>
    )
  }

  function handleBlinkRetry() {
    detectorRef.current = createBlinkDetector()
    calibrationSamplesRef.current = []
    calibrationPhaseRef.current = 'collecting'
    setBlinkCount(0)
    setStatusMsg('Aguardando câmera...')
    setBlinkStatus('waiting')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      {debugEAR && debugStats && (
        <div className="fixed left-2 right-2 top-2 z-50 rounded border border-accent-cyan bg-black/85 p-3 font-mono text-xs text-accent-cyan">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-text">
                L atual:{' '}
                <span className="text-base text-accent-cyan">
                  {debugStats.leftEAR.toFixed(3)}
                </span>
              </div>
              <div className="text-text/70">
                min {debugStats.leftMin.toFixed(3)} / max {debugStats.leftMax.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-text">
                R atual:{' '}
                <span className="text-base text-accent-cyan">
                  {debugStats.rightEAR.toFixed(3)}
                </span>
              </div>
              <div className="text-text/70">
                min {debugStats.rightMin.toFixed(3)} / max {debugStats.rightMax.toFixed(3)}
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-between border-t border-accent-cyan/30 pt-2">
            <span>
              estado:{' '}
              <span
                className={
                  debugStats.eyeState === 'closed' ? 'text-accent-pink' : 'text-accent-cyan'
                }
              >
                {debugStats.eyeState}
              </span>
            </span>
            <span>piscadas: {debugStats.count}</span>
            <span>frames: {debugStats.frames}</span>
          </div>
          <div className="mt-1 text-[10px] text-text/60">
            fase:{' '}
            <span className="text-text/90">
              {debugStats.phase === 'collecting' ? 'calibrando' : 'pronto'}
            </span>
            {' | '}
            baseline:{' '}
            <span className="text-text/90">
              {debugStats.baseline !== null ? debugStats.baseline.toFixed(3) : 'fallback'}
            </span>
            {' | '}
            corte: EAR &lt; {debugStats.thresholdClosed.toFixed(3)} (média)
          </div>
        </div>
      )}
      <CameraView stream={stream} videoRef={videoRef} />
      <BlinkChallenge
        count={blinkCount}
        required={REQUIRED_BLINKS}
        status={blinkStatus}
        onRetry={blinkStatus === 'timeout' ? handleBlinkRetry : undefined}
      />
      <StatusBadge tone={blinkStatus === 'timeout' ? 'error' : 'info'}>{statusMsg}</StatusBadge>
      {blinkStatus === 'complete' && (
        <button
          type="button"
          onClick={handleCapture}
          disabled={capturing}
          className="border border-accent-cyan bg-transparent px-8 py-3 font-mono uppercase tracking-wider text-accent-cyan transition hover:bg-accent-cyan hover:text-bg disabled:opacity-40"
        >
          {capturing ? 'Analisando...' : 'Tirar foto'}
        </button>
      )}
    </main>
  )
}
