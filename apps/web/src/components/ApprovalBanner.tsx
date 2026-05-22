import { Icon } from './Icon'

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
    <div>
      <div
        className={`result-glyph ${isApproved ? 'result-glyph-approved' : 'result-glyph-denied'}`}
      >
        {isApproved ? <Icon.confirmation /> : <Icon.neutral />}
      </div>
      <h1 className={`result-headline ${isApproved ? 'tone-approved' : 'tone-denied'}`}>
        {HEADLINE[decisao]}
      </h1>
      {SUPPORT[decisao] && <p className="result-support">{SUPPORT[decisao]}</p>}
    </div>
  )
}
