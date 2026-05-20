import {
  classifyAge,
  VerifyResponseSchema,
  VerifyDeclarationResponseSchema,
  type ClientFeatures,
  type VerifyResponse,
  type VerifyDeclarationResponse
} from '@face-ai/shared'
import { env } from '../env'

const LIVENESS_THRESHOLD = 0.8
const ANTISPOOF_THRESHOLD = 0.85

export type MockDecisionOverride = 'aprovado' | 'requer_declaracao' | 'recusado'

export function getMockDecisionOverride(): MockDecisionOverride | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('mockDecision')
  return v === 'aprovado' || v === 'requer_declaracao' || v === 'recusado' ? v : null
}

export function cannedVerifyResponse(
  override: MockDecisionOverride,
  sessionId: string
): VerifyResponse {
  if (override === 'aprovado') {
    return {
      decisao: 'aprovado',
      faixa_etaria: '22+',
      jwt: `mock-jwt-${sessionId}`,
      motivo: null,
      tamper_detected: false
    }
  }
  if (override === 'requer_declaracao') {
    return {
      decisao: 'requer_declaracao',
      faixa_etaria: '16-21',
      jwt: `mock-jwt-${sessionId}`,
      motivo: null,
      tamper_detected: false
    }
  }
  return {
    decisao: 'recusado',
    faixa_etaria: '13-15',
    jwt: `mock-jwt-${sessionId}`,
    motivo: 'faixa_etaria_minor',
    tamper_detected: false
  }
}

export async function verifyMock(
  features: ClientFeatures,
  sessionId: string,
  _local: string
): Promise<VerifyResponse> {
  const override = getMockDecisionOverride()
  if (override) return cannedVerifyResponse(override, sessionId)

  const faixa = classifyAge(features.age)

  if (features.livenessScore < LIVENESS_THRESHOLD) {
    return {
      decisao: 'recusado',
      faixa_etaria: faixa,
      jwt: `mock-jwt-${sessionId}`,
      motivo: 'liveness_fail',
      tamper_detected: false
    }
  }

  if (features.antiSpoofScore < ANTISPOOF_THRESHOLD) {
    return {
      decisao: 'recusado',
      faixa_etaria: faixa,
      jwt: `mock-jwt-${sessionId}`,
      motivo: 'antispoof_fail',
      tamper_detected: false
    }
  }

  if (faixa === '22+') {
    return {
      decisao: 'aprovado',
      faixa_etaria: faixa,
      jwt: `mock-jwt-${sessionId}`,
      motivo: null,
      tamper_detected: false
    }
  }

  if (faixa === '16-21') {
    return {
      decisao: 'requer_declaracao',
      faixa_etaria: faixa,
      jwt: `mock-jwt-${sessionId}`,
      motivo: null,
      tamper_detected: false
    }
  }

  return {
    decisao: 'recusado',
    faixa_etaria: faixa,
    jwt: `mock-jwt-${sessionId}`,
    motivo: 'faixa_etaria_minor',
    tamper_detected: false
  }
}

export async function verifyDeclarationMock(
  sessionId: string,
  previousJwt: string
): Promise<VerifyDeclarationResponse> {
  return {
    decisao: 'aprovado_com_declaracao',
    jwt: `mock-jwt-decl-${sessionId}-${previousJwt.slice(-6)}`,
    timestamp_declaracao: new Date().toISOString()
  }
}

export async function verify(
  photo: Blob,
  features: ClientFeatures,
  sessionId: string,
  local: string
): Promise<VerifyResponse> {
  if (env.VITE_USE_MOCK_API) {
    return verifyMock(features, sessionId, local)
  }
  const formData = new FormData()
  formData.append('photo', photo)
  formData.append('clientFeatures', JSON.stringify(features))
  formData.append('sessionId', sessionId)
  formData.append('local', local)

  const res = await fetch(`${env.VITE_API_URL}/verify`, {
    method: 'POST',
    body: formData
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error('verify_failed'), {
      name: body.error ?? 'INTERNAL',
      status: res.status
    })
  }
  const data = await res.json()
  return VerifyResponseSchema.parse(data)
}

export async function verifyDeclaration(
  sessionId: string,
  previousJwt: string
): Promise<VerifyDeclarationResponse> {
  if (env.VITE_USE_MOCK_API) {
    return verifyDeclarationMock(sessionId, previousJwt)
  }
  const res = await fetch(`${env.VITE_API_URL}/verify-declaration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      previousJwt,
      declaroSerMaiorDe18: true
    })
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error('verify_declaration_failed'), {
      name: body.error ?? 'INTERNAL',
      status: res.status
    })
  }
  const data = await res.json()
  return VerifyDeclarationResponseSchema.parse(data)
}
