import { useEffect, useRef, useState, useMemo } from 'react'
import type { ClientFeatures, VerifyResponse } from '@face-ai/shared'
import { CameraView } from '../components/CameraView'
import { BlinkChallenge, type BlinkChallengeStatus } from '../components/BlinkChallenge'
import { StatusBadge } from '../components/StatusBadge'
import { useCamera } from '../hooks/useCamera'
import { useHuman } from '../hooks/useHuman'
import {
  buildEyeEARPoints,
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
  const [blinkCount, setBlinkCount] = useState(0)
  const [blinkStatus, setBlinkStatus] = useState<BlinkChallengeStatus>('waiting')
  const [statusMsg, setStatusMsg] = useState(
    mockOverride ? `Modo demo: decisão "${mockOverride}"` : 'Aguardando câmera...',
  )
  const [capturing, setCapturing] = useState(false)

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
    setStatusMsg('Pisque duas vezes para confirmar.')
    const startedAt = performance.now()
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      const elapsed = performance.now() - startedAt
      if (elapsed > BLINK_TIMEOUT_MS) {
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
            detectorRef.current.processFrame(leftEAR, rightEAR, performance.now())
            const count = detectorRef.current.getCount()
            setBlinkCount(count)
            if (count >= REQUIRED_BLINKS) {
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
  }, [realPipelineEnabled, stream, human, blinkStatus])

  async function handleCapture() {
    const video = videoRef.current
    if (!video || !human || capturing) return
    setCapturing(true)
    setStatusMsg('Analisando...')
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
