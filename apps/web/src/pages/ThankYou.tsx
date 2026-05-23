import { BrandLogo } from '../components/BrandLogo'

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
          <span className="result-accent result-accent-denied" aria-hidden="true" />
          <h1 className="result-headline" style={{ marginBottom: 12 }}>
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
