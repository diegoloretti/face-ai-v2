export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <h1 className="font-display text-3xl text-accent-cyan">Política de privacidade</h1>
      <p className="rounded border border-accent-pink/40 bg-surface p-3 font-mono text-xs text-accent-pink">
        PLACEHOLDER - aguardando revisão do DPO BAT (vide spec seção 13).
      </p>
      <section className="space-y-3 font-mono text-sm text-text">
        <h2 className="font-display text-lg text-accent-cyan">Dados coletados</h2>
        <p>
          Sua imagem capturada pela câmera é processada em memória para estimar sua faixa etária. A
          imagem não é armazenada nem transmitida.
        </p>
        <h2 className="font-display text-lg text-accent-cyan">Finalidade</h2>
        <p>
          Verificar se você atende aos requisitos de idade para acesso a produtos restritos a
          maiores de 18 anos.
        </p>
        <h2 className="font-display text-lg text-accent-cyan">Retenção</h2>
        <p>Metadados da verificação (sem imagem) são armazenados por até 90 dias.</p>
        <h2 className="font-display text-lg text-accent-cyan">Seus direitos</h2>
        <p>
          Você pode solicitar acesso, correção ou exclusão dos seus dados via o DPO da BAT (contato
          a ser confirmado).
        </p>
      </section>
      <button
        type="button"
        onClick={onBack}
        className="self-start border border-border px-6 py-2 font-mono text-muted transition hover:border-accent-cyan hover:text-accent-cyan"
      >
        Voltar
      </button>
    </main>
  )
}
