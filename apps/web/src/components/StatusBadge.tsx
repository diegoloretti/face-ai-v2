import type { ReactNode } from 'react'

type Tone = 'info' | 'success' | 'error'

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="status-badge" data-tone={tone}>
      {children}
    </span>
  )
}
