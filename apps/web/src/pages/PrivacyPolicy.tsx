import { BrandLogo } from '../components/BrandLogo'
import { Icon } from '../components/Icon'

export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <main className="screen">
      <BrandLogo />
      <div className="stage" style={{ alignItems: 'stretch', justifyContent: 'flex-start' }}>
        <div className="col col-720" style={{ margin: '0 auto' }}>
          <div className="privacy-header">
            <button type="button" className="backlink" onClick={onBack}>
              <Icon.arrowLeft style={{ width: 14, height: 14 }} />
              Voltar
            </button>
            <span className="kicker" style={{ margin: 0 }}>
              Documento
            </span>
          </div>

          <h1 className="h1">Política de privacidade</h1>

          <div className="privacy-banner" role="status">
            <Icon.warn className="privacy-banner-icon" />
            <div className="privacy-banner-text">
              PLACEHOLDER - aguardando revisão final do DPO.
            </div>
          </div>

          <div className="privacy-section">
            <h2>Dados coletados</h2>
            <p>
              Sua imagem capturada pela câmera é processada em memória para estimar sua faixa
              etária. A imagem não é armazenada nem transmitida.
            </p>
          </div>

          <div className="privacy-section">
            <h2>Finalidade</h2>
            <p>
              Verificar se você atende aos requisitos de idade para acesso a produtos restritos
              a maiores de 18 anos.
            </p>
          </div>

          <div className="privacy-section">
            <h2>Retenção</h2>
            <p>Metadados da verificação (sem imagem) são armazenados por até 90 dias.</p>
          </div>

          <div className="privacy-section">
            <h2>Seus direitos</h2>
            <p>
              Você pode solicitar acesso, correção ou exclusão dos seus dados via o DPO da BAT
              (contato a ser confirmado).
            </p>
          </div>
        </div>
      </div>
      <div className="rainbow-bar" />
    </main>
  )
}
