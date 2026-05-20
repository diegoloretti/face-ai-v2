const TIPS = [
  'Garanta boa iluminação no ambiente.',
  'Mantenha o rosto centralizado no oval.',
  'Esteja sozinho na frente da câmera.',
  'Remova óculos escuros, máscaras ou chapéus.',
  'Você será solicitado a piscar duas vezes para confirmar sua presença.'
]

export function Instructions({ onProceed }: { onProceed: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-display text-3xl text-accent-cyan">
        Antes de começar
      </h1>
      <ul className="space-y-3 text-left font-mono text-sm text-text">
        {TIPS.map((tip) => (
          <li key={tip} className="flex gap-3">
            <span className="text-accent-cyan">›</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onProceed}
        className="border border-accent-cyan bg-transparent px-8 py-3 font-mono uppercase tracking-wider text-accent-cyan transition hover:bg-accent-cyan hover:text-bg"
      >
        Continuar
      </button>
    </main>
  )
}
