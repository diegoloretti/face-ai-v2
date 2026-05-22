export function FaceOval() {
  return (
    <div className="face-oval" aria-hidden="true">
      <svg viewBox="0 0 480 360" preserveAspectRatio="xMidYMid meet">
        <ellipse
          cx="240"
          cy="180"
          rx="168"
          ry="162"
          fill="none"
          stroke="rgba(0,167,225,0.45)"
          strokeWidth="2"
          strokeDasharray="6 8"
        />
      </svg>
    </div>
  )
}

export function CalibratingRing() {
  return (
    <div className="calibrating-ring" aria-hidden="true">
      <svg viewBox="0 0 480 360" preserveAspectRatio="xMidYMid meet">
        <ellipse
          cx="240"
          cy="180"
          rx="172"
          ry="166"
          fill="none"
          stroke="rgba(0,167,225,0.85)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="120 880"
        />
      </svg>
    </div>
  )
}
