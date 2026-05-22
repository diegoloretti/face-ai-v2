import { useState } from 'react'
import { useSession } from './hooks/useSession'
import { Consent } from './pages/Consent'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { Instructions } from './pages/Instructions'
import { Camera } from './pages/Camera'
import { DeclarationRequired } from './pages/DeclarationRequired'
import { Result } from './pages/Result'
import { ThankYou } from './pages/ThankYou'
import { StatusBadge } from './components/StatusBadge'
import { verifyDeclaration } from './services/api'

export function App() {
  const { state, dispatch } = useSession()
  const [confirmingDeclaration, setConfirmingDeclaration] = useState(false)

  function handleInitialRefusal() {
    dispatch({ type: 'CONSENT_REJECTED' })
  }

  async function handleDeclarationConfirmed() {
    if (!state.verifyResponse) return
    if (confirmingDeclaration) return
    setConfirmingDeclaration(true)
    try {
      const decl = await verifyDeclaration(state.sessionId, state.verifyResponse.jwt)
      dispatch({ type: 'DECLARATION_CONFIRMED', response: decl })
    } catch (err) {
      console.error('verify_declaration_failed', err)
      setConfirmingDeclaration(false)
      dispatch({ type: 'DECLARATION_REFUSED' })
    }
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
          submitting={confirmingDeclaration}
        />
      )
    case 'result': {
      const response = state.verifyResponse
      if (!response) {
        return (
          <main className="screen">
            <div className="stage">
              <div className="col col-480" style={{ alignItems: 'center', textAlign: 'center' }}>
                <StatusBadge tone="error">Estado inválido</StatusBadge>
                <p className="result-support" style={{ marginTop: 16 }}>
                  Nenhum resultado disponível. Recarregue a página.
                </p>
              </div>
            </div>
          </main>
        )
      }
      return (
        <Result
          response={response}
          declarationConfirmed={state.declarationResponse !== null}
          onRetry={() => dispatch({ type: 'RETRY' })}
          onRestart={() => dispatch({ type: 'RESTART' })}
        />
      )
    }
    case 'thankyou':
      return <ThankYou reason={state.verifyResponse ? 'declaration_refused' : 'initial_refusal'} />
  }
}
