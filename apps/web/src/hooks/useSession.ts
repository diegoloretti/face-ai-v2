import { useReducer, useMemo } from 'react'
import {
  sanitizeLocal,
  type VerifyResponse,
  type VerifyDeclarationResponse
} from '@face-ai/shared'

export type Screen =
  | 'consent'
  | 'privacy'
  | 'instructions'
  | 'camera'
  | 'declaration'
  | 'result'
  | 'thankyou'

export type SessionState = {
  screen: Screen
  sessionId: string
  local: string
  verifyResponse: VerifyResponse | null
  declarationResponse: VerifyDeclarationResponse | null
}

export type SessionAction =
  | { type: 'CONSENT_ACCEPTED' }
  | { type: 'CONSENT_REJECTED' }
  | { type: 'VIEW_PRIVACY' }
  | { type: 'PRIVACY_BACK' }
  | { type: 'INSTRUCTIONS_PROCEED' }
  | { type: 'VERIFY_RESPONSE'; response: VerifyResponse }
  | { type: 'DECLARATION_CONFIRMED'; response: VerifyDeclarationResponse }
  | { type: 'DECLARATION_REFUSED' }
  | { type: 'RETRY' }

export function initialSessionState(): SessionState {
  const local =
    typeof window !== 'undefined'
      ? sanitizeLocal(new URLSearchParams(window.location.search).get('local'))
      : 'desconhecido'
  return {
    screen: 'consent',
    sessionId: crypto.randomUUID(),
    local,
    verifyResponse: null,
    declarationResponse: null
  }
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case 'CONSENT_ACCEPTED':
      return { ...state, screen: 'instructions' }
    case 'CONSENT_REJECTED':
      return { ...state, screen: 'thankyou' }
    case 'VIEW_PRIVACY':
      return { ...state, screen: 'privacy' }
    case 'PRIVACY_BACK':
      return { ...state, screen: 'consent' }
    case 'INSTRUCTIONS_PROCEED':
      return { ...state, screen: 'camera' }
    case 'VERIFY_RESPONSE': {
      const nextScreen: Screen =
        action.response.decisao === 'requer_declaracao' ? 'declaration' : 'result'
      return { ...state, screen: nextScreen, verifyResponse: action.response }
    }
    case 'DECLARATION_CONFIRMED':
      return { ...state, screen: 'result', declarationResponse: action.response }
    case 'DECLARATION_REFUSED':
      return { ...state, screen: 'thankyou' }
    case 'RETRY':
      return {
        ...state,
        screen: 'camera',
        verifyResponse: null,
        declarationResponse: null
      }
  }
}

export function useSession() {
  const initial = useMemo(initialSessionState, [])
  const [state, dispatch] = useReducer(sessionReducer, initial)
  return { state, dispatch }
}
