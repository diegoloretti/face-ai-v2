import { useState } from 'react'

export function DeclarationRequired({
  onConfirm,
  onRefuse,
  submitting = false,
}: {
  onConfirm: () => void
  onRefuse: () => void
  submitting?: boolean
}) {
  const [checked, setChecked] = useState(false)
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-display text-3xl text-accent-cyan">Verificação adicional</h1>
      <p className="max-w-md font-mono text-sm text-text">
        Nosso sistema estimou sua idade na faixa 16-21 anos. Para prosseguir, você precisa declarar
        explicitamente que é maior de 18 anos.
      </p>
      <label className="flex items-start gap-3 text-left font-mono text-sm text-text">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-4 w-4 accent-accent-cyan"
        />
        <span>
          Declaro, sob as penas da lei, que tenho 18 anos ou mais e estou apto a acessar este
          conteúdo.
        </span>
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={!checked || submitting}
          onClick={onConfirm}
          className="border border-accent-cyan bg-transparent px-8 py-3 font-mono uppercase tracking-wider text-accent-cyan transition hover:bg-accent-cyan hover:text-bg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent-cyan"
        >
          {submitting ? 'Confirmando...' : 'Confirmar declaração'}
        </button>
        <button
          type="button"
          onClick={onRefuse}
          className="border border-border bg-transparent px-8 py-3 font-mono uppercase tracking-wider text-muted transition hover:border-accent-pink hover:text-accent-pink"
        >
          Não declarar
        </button>
      </div>
    </main>
  )
}
