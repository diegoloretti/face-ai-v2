import { useEffect } from 'react'
import { BrandLogo } from '../components/BrandLogo'

export function Consent({
  onAccept,
  onReject,
  onViewPrivacy,
}: {
  onAccept: () => void
  onReject: () => void
  onViewPrivacy: () => void
}) {
  useEffect(() => {
    performance.mark('flow-start')
  }, [])

  return (
    <main className="screen">
      <BrandLogo />
      <div className="stage">
        <div className="col col-480">
          <p className="kicker">Bem-vindo</p>
          <h1 className="h1">Verificação de idade</h1>
          <p className="subtitle">
            Use sua câmera para confirmar que você atende ao requisito de idade.
          </p>
          <p className="body-text">
            Sua câmera será usada apenas para estimar sua faixa etária. Nenhuma foto é
            armazenada. Você pode recusar ou ler nossa{' '}
            <button type="button" className="link" onClick={onViewPrivacy}>
              política de privacidade
            </button>{' '}
            antes de continuar.
          </p>
          <div className="actions actions-pinned">
            <button type="button" className="btn btn-secondary btn-lg" onClick={onReject}>
              Recusar
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => {
                performance.mark('flow-consent-accepted')
                onAccept()
              }}
            >
              Aceitar e continuar
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
