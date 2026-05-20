type Decisao =
  | 'aprovado'
  | 'recusado'
  | 'requer_declaracao'
  | 'aprovado_com_declaracao'

const LABEL: Record<Decisao, string> = {
  aprovado: 'APROVADO',
  recusado: 'RECUSADO',
  requer_declaracao: 'REQUER DECLARAÇÃO',
  aprovado_com_declaracao: 'APROVADO COM DECLARAÇÃO'
}

const COLOR: Record<Decisao, string> = {
  aprovado: 'border-accent-cyan text-accent-cyan',
  recusado: 'border-accent-pink text-accent-pink',
  requer_declaracao: 'border-accent-pink text-accent-pink',
  aprovado_com_declaracao: 'border-accent-cyan text-accent-cyan'
}

export function ApprovalBanner({ decisao }: { decisao: Decisao }) {
  return (
    <div
      className={`border-2 px-6 py-4 font-display text-3xl tracking-widest ${COLOR[decisao]}`}
    >
      {LABEL[decisao]}
    </div>
  )
}
