import { useSession } from './hooks/useSession'
import { Consent } from './pages/Consent'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { Instructions } from './pages/Instructions'
import { Camera } from './pages/Camera'
import { DeclarationRequired } from './pages/DeclarationRequired'
import { Result } from './pages/Result'
import { ThankYou } from './pages/ThankYou'
import { StatusBadge } from './components/StatusBadge'
import { downloadVerificationJson } from './services/jwtDownload'
import { verifyDeclaration } from './services/api'
import type { VerificationJson, VerifyResponse } from '@face-ai/shared'

export function App() {
  const { state, dispatch } = useSession()

  function handleInitialRefusal() {
    const payload: VerificationJson = {
      schema_version: '2.0',
      session_id: state.sessionId,
      timestamp: new Date().toISOString(),
      local: state.local,
      decisao: 'recusado_inicial',
      faixa_etaria: null,
      motivo: 'recusa_inicial',
      declaracao: null,
      jwt: null,
    }
    downloadVerificationJson(payload)
    dispatch({ type: 'CONSENT_REJECTED' })
  }

  async function handleDeclarationConfirmed() {
    if (!state.verifyResponse) return
    try {
      const decl = await verifyDeclaration(state.sessionId, state.verifyResponse.jwt)
      const payload: VerificationJson = {
        schema_version: '2.0',
        session_id: state.sessionId,
        timestamp: new Date().toISOString(),
        local: state.local,
        decisao: 'aprovado_com_declaracao',
        faixa_etaria: state.verifyResponse.faixa_etaria,
        motivo: null,
        declaracao: {
          declarou: true,
          timestamp_declaracao: decl.timestamp_declaracao,
        },
        jwt: decl.jwt,
      }
      downloadVerificationJson(payload)
      dispatch({ type: 'DECLARATION_CONFIRMED', response: decl })
    } catch (err) {
      console.error('verify_declaration_failed', err)
      dispatch({ type: 'DECLARATION_REFUSED' })
    }
  }

  function handleDownloadResult(verifyResponse: VerifyResponse) {
    const declResponse = state.declarationResponse
    const payload: VerificationJson = {
      schema_version: '2.0',
      session_id: state.sessionId,
      timestamp: new Date().toISOString(),
      local: state.local,
      decisao: declResponse ? 'aprovado_com_declaracao' : verifyResponse.decisao,
      faixa_etaria: verifyResponse.faixa_etaria,
      motivo: verifyResponse.motivo,
      declaracao: declResponse
        ? {
            declarou: true,
            timestamp_declaracao: declResponse.timestamp_declaracao,
          }
        : null,
      jwt: declResponse ? declResponse.jwt : verifyResponse.jwt,
    }
    downloadVerificationJson(payload)
  }

  switch (state.screen) {
    case 'consent':
      return (
        <Consent
          onAccept={() => dispatch({ type: 'CONSENT_ACCEPTED' })}
          onReject={handleInitialRefusal}
          onViewPrivacy={() => dispatch({ type: 'VIEW_PRIVACY' })}
        />
      )
    case 'privacy':
      return <PrivacyPolicy onBack={() => dispatch({ type: 'PRIVACY_BACK' })} />
    case 'instructions':
      return <Instructions onProceed={() => dispatch({ type: 'INSTRUCTIONS_PROCEED' })} />
    case 'camera':
      return (
        <Camera
          sessionId={state.sessionId}
          local={state.local}
          onResponse={(response) => dispatch({ type: 'VERIFY_RESPONSE', response })}
        />
      )
    case 'declaration':
      return (
        <DeclarationRequired
          onConfirm={handleDeclarationConfirmed}
          onRefuse={() => dispatch({ type: 'DECLARATION_REFUSED' })}
        />
      )
    case 'result': {
      const response = state.verifyResponse
      if (!response) {
        return (
          <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <StatusBadge tone="error">Estado inválido</StatusBadge>
            <p className="font-mono text-sm text-muted">
              Nenhum resultado disponível. Recarregue a página.
            </p>
          </main>
        )
      }
      return (
        <Result
          response={response}
          declarationConfirmed={state.declarationResponse !== null}
          onRetry={() => dispatch({ type: 'RETRY' })}
          onDownload={() => handleDownloadResult(response)}
        />
      )
    }
    case 'thankyou':
      return <ThankYou reason={state.verifyResponse ? 'declaration_refused' : 'initial_refusal'} />
  }
}
