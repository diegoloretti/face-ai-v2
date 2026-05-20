import type { VerifyResponse } from '@face-ai/shared'
import { ApprovalBanner } from '../components/ApprovalBanner'
import { DownloadButton } from '../components/DownloadButton'

const MOTIVO_PT: Record<string, string> = {
  faixa_etaria_minor: 'Faixa etária estimada abaixo do permitido.',
  liveness_fail: 'Não conseguimos confirmar sua presença.',
  antispoof_fail: 'Detectamos uso de foto ou tela.',
}

export function Result({
  response,
  declarationConfirmed,
  onRetry,
  onDownload,
}: {
  response: VerifyResponse
  declarationConfirmed: boolean
  onRetry: () => void
  onDownload: () => void
}) {
  const effectiveDecisao =
    declarationConfirmed && response.decisao === 'requer_declaracao'
      ? 'aprovado_com_declaracao'
      : response.decisao

  const motivoPt = response.motivo ? (MOTIVO_PT[response.motivo] ?? response.motivo) : null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <ApprovalBanner decisao={effectiveDecisao} />
      <p className="font-mono text-xs text-muted">
        Faixa etária: <span className="text-text">{response.faixa_etaria}</span>
      </p>
      {motivoPt && <p className="max-w-md font-mono text-sm text-accent-pink">{motivoPt}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <DownloadButton onClick={onDownload} />
        <button
          type="button"
          onClick={onRetry}
          className="border border-border bg-transparent px-6 py-2 font-mono text-muted transition hover:border-accent-cyan hover:text-accent-cyan"
        >
          ↺ Nova verificação
        </button>
      </div>
    </main>
  )
}
