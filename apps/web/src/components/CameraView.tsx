import { useEffect, type RefObject } from 'react'
import { FaceOval, CalibratingRing } from './FaceOval'

type CameraState =
  | 'permission_pending'
  | 'camera_error'
  | 'calibrating'
  | 'blink_active'
  | 'blink_timeout'
  | 'blink_complete'
  | 'capturing'

export function CameraView({
  stream,
  videoRef,
  state = 'blink_active',
}: {
  stream: MediaStream | null
  videoRef: RefObject<HTMLVideoElement | null>
  state?: CameraState
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

  const showOval = state !== 'permission_pending' && state !== 'camera_error'
  const showSkeleton = state === 'permission_pending'
  const showCalibratingRing = state === 'calibrating'
  const showShimmer = state === 'capturing'

  return (
    <div className="camera-frame" data-state={state}>
      <div className="camera-feed">
        <video ref={videoRef} muted playsInline />
      </div>
      {showSkeleton && (
        <div className="cam-skeleton">
          <div className="cam-skeleton-ring" />
        </div>
      )}
      {showOval && <FaceOval />}
      {showCalibratingRing && <CalibratingRing />}
      {showShimmer && <div className="cam-shimmer" />}
    </div>
  )
}
