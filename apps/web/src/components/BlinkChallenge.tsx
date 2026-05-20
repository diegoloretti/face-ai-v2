export type BlinkChallengeStatus = 'waiting' | 'complete' | 'timeout'

export function BlinkChallenge({
  count,
  required,
  status,
  onRetry,
}: {
  count: number
  required: number
  status: BlinkChallengeStatus
  onRetry?: () => void
}) {
  if (status === 'timeout') {
    return (
      <div className="flex flex-col items-center gap-3 text-center font-mono text-accent-pink">
        <span>Tempo esgotado. Posicione-se novamente.</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="border border-accent-pink bg-transparent px-6 py-2 font-mono uppercase tracking-wider text-accent-pink transition hover:bg-accent-pink hover:text-bg"
          >
            Tentar de novo
          </button>
        )}
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
