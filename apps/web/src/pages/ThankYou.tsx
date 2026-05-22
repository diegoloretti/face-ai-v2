import { BrandLogo } from '../components/BrandLogo'
import { Icon } from '../components/Icon'

export type ThankYouReason = 'initial_refusal' | 'declaration_refused'

const MESSAGES: Record<ThankYouReason, string> = {
  initial_refusal: 'Você optou por não realizar a verificação. Pode fechar esta janela.',
  declaration_refused: 'Declaração não confirmada. Você pode fechar esta janela.',
}

export function ThankYou({ reason }: { reason: ThankYouReason }) {
  return (
    <main className="screen">
      <BrandLogo />
      <div className="stage">
        <div className="col col-480" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div className="thanks-glyph">
            <Icon.thanks />
          </div>
          <h1 className="result-headline tone-denied" style={{ marginBottom: 12 }}>
            Obrigado pela visita.
          </h1>
          <p className="result-support" style={{ maxWidth: 360 }}>
            {MESSAGES[reason]}
          </p>
        </div>
      </div>
    </main>
  )
}
