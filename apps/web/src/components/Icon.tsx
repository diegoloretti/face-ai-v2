import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base: IconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const Icon = {
  check: (props: IconProps) => (
    <svg viewBox="0 0 24 24" strokeWidth={2} {...base} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
  confirmation: (props: IconProps) => (
    <svg viewBox="0 0 24 24" strokeWidth={1.5} {...base} {...props}>
      <path d="M6 12.5l3.5 3.5L18 8" />
    </svg>
  ),
  neutral: (props: IconProps) => (
    <svg viewBox="0 0 24 24" strokeWidth={1.75} {...base} {...props}>
      <path d="M8 12h8" />
    </svg>
  ),
  thanks: (props: IconProps) => (
    <svg viewBox="0 0 24 24" strokeWidth={1.5} {...base} {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M9 11v-2M15 11v-2M9 14c1 1.2 2 1.8 3 1.8s2-.6 3-1.8" />
    </svg>
  ),
  arrowLeft: (props: IconProps) => (
    <svg viewBox="0 0 24 24" strokeWidth={2} {...base} {...props}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  ),
  refresh: (props: IconProps) => (
    <svg viewBox="0 0 24 24" strokeWidth={1.75} {...base} {...props}>
      <path d="M4 12a8 8 0 0 1 13.7-5.7L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.7L4 15" />
      <path d="M4 20v-5h5" />
    </svg>
  ),
  warn: (props: IconProps) => (
    <svg viewBox="0 0 24 24" strokeWidth={1.75} {...base} {...props}>
      <path d="M12 4l9 16H3L12 4z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  ),
  camera: (props: IconProps) => (
    <svg viewBox="0 0 24 24" strokeWidth={1.75} {...base} {...props}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  ),
}
