export function FaceOval() {
  return (
    <div className="face-oval" aria-hidden="true">
      <div className="face-oval-shape" />
    </div>
  )
}

export function CalibratingRing() {
  return (
    <div className="face-oval calibrating-ring" aria-hidden="true">
      <svg
        className="face-oval-shape face-oval-spin"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <ellipse
          cx="50"
          cy="50"
          rx="49"
          ry="49"
          fill="none"
          stroke="rgba(0,167,225,0.9)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="38 220"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}
