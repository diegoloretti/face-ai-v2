import { classifyAge, type AgeTier } from '@face-ai/shared'

export const LIVENESS_THRESHOLD = 0.8
export const ANTISPOOF_THRESHOLD = 0.85

export type ServerFeatures = {
  age: number
  antiSpoofScore: number
  livenessScore: number
  faceDetectionScore: number
}

export type Decision = {
  decisao: 'aprovado' | 'recusado' | 'requer_declaracao'
  faixa_etaria: AgeTier
  motivo: 'liveness_fail' | 'antispoof_fail' | 'faixa_etaria_minor' | null
}

export function decidir(features: ServerFeatures): Decision {
  const faixa = classifyAge(features.age)

  if (features.livenessScore < LIVENESS_THRESHOLD) {
    return { decisao: 'recusado', faixa_etaria: faixa, motivo: 'liveness_fail' }
  }
  if (features.antiSpoofScore < ANTISPOOF_THRESHOLD) {
    return { decisao: 'recusado', faixa_etaria: faixa, motivo: 'antispoof_fail' }
  }

  if (faixa === '22+') {
    return { decisao: 'aprovado', faixa_etaria: faixa, motivo: null }
  }
  if (faixa === '16-21') {
    return { decisao: 'requer_declaracao', faixa_etaria: faixa, motivo: null }
  }
  return { decisao: 'recusado', faixa_etaria: faixa, motivo: 'faixa_etaria_minor' }
}
