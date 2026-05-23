type Decisao = 'aprovado' | 'recusado' | 'requer_declaracao' | 'aprovado_com_declaracao'

const HEADLINE: Record<Decisao, string> = {
  aprovado: 'Verificação aprovada',
  aprovado_com_declaracao: 'Verificação aprovada com declaração',
  recusado: 'Verificação não aprovada',
  requer_declaracao: 'Verificação não aprovada',
}

const SUPPORT: Partial<Record<Decisao, string>> = {
  aprovado: 'Você está liberado.',
  aprovado_com_declaracao: 'Obrigado por confirmar.',
}

export function ApprovalBanner({ decisao }: { decisao: Decisao }) {
  const isApproved = decisao === 'aprovado' || decisao === 'aprovado_com_declaracao'
  return (
    <div className="result-banner">
      <span
        className={`result-accent ${isApproved ? 'result-accent-approved' : 'result-accent-denied'}`}
        aria-hidden="true"
      />
      <h1 className="result-headline">{HEADLINE[decisao]}</h1>
      {SUPPORT[decisao] && <p className="result-support">{SUPPORT[decisao]}</p>}
    </div>
  )
}
