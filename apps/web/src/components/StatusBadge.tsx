import type { ReactNode } from 'react'

type Tone = 'info' | 'success' | 'error'

const TONE_CLASS: Record<Tone, string> = {
  info: 'text-accent-cyan',
  success: 'text-accent-cyan',
  error: 'text-accent-pink',
}

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded border border-border bg-surface px-3 py-1 text-xs font-mono uppercase tracking-wider ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  )
}
