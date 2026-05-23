import type { VerifyResponse } from '@face-ai/shared'
import { BrandLogo } from '../components/BrandLogo'
import { ApprovalBanner } from '../components/ApprovalBanner'
import { Icon } from '../components/Icon'

const MOTIVO_PT: Record<string, string> = {
  faixa_etaria_minor: 'Faixa etária estimada abaixo do permitido.',
  liveness_fail: 'Não conseguimos confirmar sua presença.',
  antispoof_fail: 'Detectamos uso de foto ou tela.',
}

export function Result({
  response,
  declarationConfirmed,
  onRetry,
  onRestart,
}: {
  response: VerifyResponse
  declarationConfirmed: boolean
  onRetry: () => void
  onRestart: () => void
}) {
  const effectiveDecisao =
    declarationConfirmed && response.decisao === 'requer_declaracao'
      ? 'aprovado_com_declaracao'
      : response.decisao

  const motivoPt = response.motivo ? (MOTIVO_PT[response.motivo] ?? response.motivo) : null

  return (
    <main className="screen">
      <BrandLogo />
      <div className="stage">
        <div className="col col-480">
          <ApprovalBanner decisao={effectiveDecisao} />
          <p className="result-meta">
            Faixa etária: <b>{response.faixa_etaria}</b>
          </p>
          {motivoPt && <div className="result-reason">{motivoPt}</div>}
          <div className="center-actions actions-pinned">
            <button type="button" className="btn btn-secondary btn-lg" onClick={onRestart}>
              <Icon.arrowLeft style={{ width: 16, height: 16 }} aria-hidden="true" />
              Voltar ao início
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={onRetry}>
              <Icon.refresh style={{ width: 16, height: 16 }} aria-hidden="true" />
              Nova verificação
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
