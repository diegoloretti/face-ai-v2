import { useCallback, useEffect, useState } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'error'

export function useCamera(enabled: boolean = true): {
  stream: MediaStream | null
  status: CameraStatus
  error: Error | null
  retry: () => void
} {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)

  const retry = useCallback(() => {
    setRetryNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let activeStream: MediaStream | null = null

    setStream(null)
    setStatus('requesting')
    setError(null)

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        activeStream = s
        setStream(s)
        setStatus('active')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e : new Error(String(e)))
        setStatus('error')
      })

    return () => {
      cancelled = true
      activeStream?.getTracks().forEach((t) => t.stop())
    }
  }, [enabled, retryNonce])

  return { stream, status, error, retry }
}
