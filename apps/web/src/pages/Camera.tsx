import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

  const { stream, error: cameraError } = useCamera(realPipelineEnabled)
  const { human, error: humanError } = useHuman(realPipelineEnabled)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const detectorRef = useRef(createBlinkDetector())
  const calibrationSamplesRef = useRef<number[]>([])
  const calibrationPhaseRef = useRef<'collecting' | 'ready'>('collecting')
  const blinkStatsRef = useRef({ leftMin: 1, leftMax: 0, rightMin: 1, rightMax: 0, frames: 0 })
  const blinkDebugReportedRef = useRef(false)
  const blinkStartedAtRef = useRef(0)
  const [blinkCount, setBlinkCount] = useState(0)
  const [blinkStatus, setBlinkStatus] = useState<BlinkChallengeStatus>('waiting')
  const [statusMsg, setStatusMsg] = useState(
    mockOverride ? `Modo demo: decisão "${mockOverride}"` : 'Aguardando câmera...',
  )
  const [capturing, setCapturing] = useState(false)

  const reportBlinkDebug = useCallback(
    (outcome: 'completed' | 'timeout') => {
      if (blinkDebugReportedRef.current) return
      blinkDebugReportedRef.current = true
      const stats = blinkStatsRef.current
      const thresholds = detectorRef.current.getThresholds()
      const payload = {
        sessionId,
        outcome,
        baseline: thresholds.baseline,
        thresholdClosed: thresholds.closed,
        leftMin: stats.leftMin === 1 ? undefined : stats.leftMin,
        leftMax: stats.leftMax === 0 ? undefined : stats.leftMax,
        rightMin: stats.rightMin === 1 ? undefined : stats.rightMin,
        rightMax: stats.rightMax === 0 ? undefined : stats.rightMax,
        blinkCount: detectorRef.current.getCount(),
        frames: stats.frames,
        elapsedMs: Math.round(performance.now() - blinkStartedAtRef.current),
        userAgent:
          typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 256) : undefined,
      }
      const clean = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined),
      )
      const url = `${env.VITE_API_URL}/metrics/blink-debug`
      const body = JSON.stringify(clean)
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon(url, blob)
      } else {
        void fetch(url, {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {})
      }
    },
    [sessionId],
  )

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
    blinkStatsRef.current = { leftMin: 1, leftMax: 0, rightMin: 1, rightMax: 0, frames: 0 }
    blinkDebugReportedRef.current = false
    blinkStartedAtRef.current = performance.now()
    const startedAt = blinkStartedAtRef.current
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      const now = performance.now()
      const elapsed = now - startedAt
      if (elapsed > BLINK_TIMEOUT_MS) {
        reportBlinkDebug('timeout')
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

            const stats = blinkStatsRef.current
            stats.leftMin = Math.min(stats.leftMin, leftEAR)
            stats.leftMax = Math.max(stats.leftMax, leftEAR)
            stats.rightMin = Math.min(stats.rightMin, rightEAR)
            stats.rightMax = Math.max(stats.rightMax, rightEAR)
            stats.frames += 1

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

            if (calibrationPhaseRef.current === 'ready' && count >= REQUIRED_BLINKS) {
              reportBlinkDebug('completed')
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
  }, [realPipelineEnabled, stream, human, blinkStatus, reportBlinkDebug])

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
