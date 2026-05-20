export type ThankYouReason = 'initial_refusal' | 'declaration_refused'

const MESSAGES: Record<ThankYouReason, string> = {
  initial_refusal: 'Você optou por não realizar a verificação. Pode fechar esta janela.',
  declaration_refused: 'Declaração não confirmada. Você pode fechar esta janela.',
}

export function ThankYou({ reason }: { reason: ThankYouReason }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-display text-4xl text-accent-cyan">Obrigado pela visita.</h1>
      <p className="max-w-md font-mono text-sm text-muted">{MESSAGES[reason]}</p>
    </main>
  )
}
