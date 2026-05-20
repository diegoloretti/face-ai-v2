export function Consent({
  onAccept,
  onReject,
  onViewPrivacy,
}: {
  onAccept: () => void
  onReject: () => void
  onViewPrivacy: () => void
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="font-display text-5xl tracking-tight text-accent-cyan">FACE.AI</h1>
      <p className="max-w-md text-center font-mono text-text">
        Verificação de idade por inteligência artificial.
      </p>
      <p className="max-w-md text-center font-mono text-sm text-muted">
        Sua câmera será usada apenas para estimar sua faixa etária. Nenhuma foto é armazenada. Você
        pode recusar ou ler nossa{' '}
        <button type="button" onClick={onViewPrivacy} className="underline hover:text-accent-cyan">
          política de privacidade
        </button>{' '}
        antes de continuar.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onAccept}
          className="border border-accent-cyan bg-transparent px-8 py-3 font-mono uppercase tracking-wider text-accent-cyan transition hover:bg-accent-cyan hover:text-bg"
        >
          Aceitar e continuar
        </button>
        <button
          type="button"
          onClick={onReject}
          className="border border-border bg-transparent px-8 py-3 font-mono uppercase tracking-wider text-muted transition hover:border-accent-pink hover:text-accent-pink"
        >
          Recusar
        </button>
      </div>
    </main>
  )
}
