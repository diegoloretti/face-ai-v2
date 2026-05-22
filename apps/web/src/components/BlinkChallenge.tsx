import { Icon } from './Icon'

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
      <div className="cam-warning" role="alert">
        <Icon.warn className="cam-warning-icon" />
        <div style={{ flex: 1 }}>
          <div className="cam-warning-text">Tempo esgotado. Posicione-se novamente.</div>
        </div>
        {onRetry && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ height: 36, padding: '0 14px', fontSize: 14 }}
            onClick={onRetry}
          >
            Tentar de novo
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="blink-counter" data-flash={count > 0 ? 'true' : 'false'}>
      <span>Pisque duas vezes</span>
      <span className="blink-counter-num">
        {status === 'complete' ? '✓' : `${count} / ${required}`}
      </span>
    </div>
  )
}
