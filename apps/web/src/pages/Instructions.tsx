import { BrandLogo } from '../components/BrandLogo'

const TIPS = [
  'Garanta boa iluminação no ambiente.',
  'Mantenha o rosto centralizado no oval.',
  'Esteja sozinho na frente da câmera.',
  'Remova óculos escuros, máscaras ou chapéus.',
  'Você será solicitado a piscar duas vezes para confirmar sua presença.',
]

export function Instructions({ onProceed }: { onProceed: () => void }) {
  return (
    <main className="screen">
      <BrandLogo />
      <div className="stage">
        <div className="col col-560">
          <p className="kicker">Etapa 1 de 3</p>
          <h1 className="h1">Antes de começar</h1>
          <p className="subtitle">
            Leia rapidamente as recomendações abaixo para uma verificação sem interrupções.
          </p>
          <ul className="checklist">
            {TIPS.map((tip, i) => (
              <li key={tip} className="checklist-item">
                <span className="checklist-glyph">{i + 1}</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <div className="actions actions-pinned">
            <button type="button" className="btn btn-primary btn-lg" onClick={onProceed}>
              Continuar
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
