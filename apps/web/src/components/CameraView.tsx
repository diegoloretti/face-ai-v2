import { useEffect, type RefObject } from 'react'

export function CameraView({
  stream,
  videoRef,
  width = 640,
  height = 480
}: {
  stream: MediaStream | null
  videoRef: RefObject<HTMLVideoElement | null>
  width?: number
  height?: number
}) {
  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    video.srcObject = stream
    const playPromise = video.play()
    if (playPromise) {
      playPromise.catch(() => {})
    }
    return () => {
      video.srcObject = null
    }
  }, [stream, videoRef])

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-black"
      style={{ width, height }}
    >
      <video
        ref={videoRef}
        className="h-full w-full"
        style={{ transform: 'scaleX(-1)' }}
        muted
        playsInline
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${width} ${height}`}
      >
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width * 0.35}
          ry={height * 0.45}
          fill="none"
          stroke="rgba(0,255,204,0.6)"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
      </svg>
    </div>
  )
}
