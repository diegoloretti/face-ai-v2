export type BlinkChallengeStatus = 'waiting' | 'complete' | 'timeout'

export function BlinkChallenge({
  count,
  required,
  status,
}: {
  count: number
  required: number
  status: BlinkChallengeStatus
}) {
  if (status === 'timeout') {
    return (
      <div className="text-center font-mono text-accent-pink">
        Tempo esgotado. Posicione-se novamente.
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="font-display text-lg text-text">
        Pisque duas vezes para confirmarmos sua presença.
      </p>
      <p className="font-mono text-2xl text-accent-cyan">
        {status === 'complete' ? '✓' : `${count} / ${required}`}
      </p>
    </div>
  )
}
