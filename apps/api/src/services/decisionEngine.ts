import { classifyAge, type AgeTier } from '@face-ai/shared'
import type { Env } from '../env.js'

export type ServerFeatures = {
  age: number
  antiSpoofScore: number
  livenessScore: number
  faceDetectionScore: number
  blinkDetected?: boolean
}

export type ScoresBreakdown = {
  composite: number
  antiSpoof: number
  liveness: number
  faceDetection: number
  blinkDetected: boolean
}

export type FailureFlags = {
  failed_liveness: boolean
  failed_antispoof: boolean
  failed_composite_shadow: boolean
  failed_blink: boolean
}

export type DecisionMotivo =
  | 'liveness_fail'
  | 'antispoof_fail'
  | 'blink_missing'
  | 'composite_fail'
  | 'faixa_etaria_minor'
  | null

export type Decision = {
  decisao: 'aprovado' | 'recusado' | 'requer_declaracao'
  faixa_etaria: AgeTier
  motivo: DecisionMotivo
  scores: ScoresBreakdown
  flags: FailureFlags
}

export function decidir(features: ServerFeatures, env: Env): Decision {
  const faixa = classifyAge(features.age)
  const faceDetection = Number.isFinite(features.faceDetectionScore)
    ? features.faceDetectionScore
    : 0
  const antiSpoof = Number.isFinite(features.antiSpoofScore)
    ? features.antiSpoofScore
    : 0
  const liveness = Number.isFinite(features.livenessScore)
    ? features.livenessScore
    : 0
  const blinkDetected = features.blinkDetected ?? false

  const composite =
    env.COMPOSITE_W_ANTISPOOF * antiSpoof +
    env.COMPOSITE_W_LIVENESS * liveness +
    env.COMPOSITE_W_FACE_DETECTION * faceDetection

  const flags: FailureFlags = {
    failed_liveness: liveness < env.LIVENESS_THRESHOLD,
    failed_antispoof: antiSpoof < env.ANTISPOOF_THRESHOLD,
    failed_composite_shadow: composite < env.COMPOSITE_THRESHOLD_SHADOW,
    failed_blink: env.REQUIRE_BLINK && !blinkDetected,
  }

  const scores: ScoresBreakdown = {
    composite,
    antiSpoof,
    liveness,
    faceDetection,
    blinkDetected,
  }

  const base = { faixa_etaria: faixa, scores, flags }

  if (flags.failed_blink) {
    return { ...base, decisao: 'recusado', motivo: 'blink_missing' }
  }

  if (env.DECISION_MODE === 'legacy_and') {
    if (flags.failed_liveness) {
      return { ...base, decisao: 'recusado', motivo: 'liveness_fail' }
    }
    if (flags.failed_antispoof) {
      return { ...base, decisao: 'recusado', motivo: 'antispoof_fail' }
    }
  } else {
    if (flags.failed_composite_shadow) {
      return { ...base, decisao: 'recusado', motivo: 'composite_fail' }
    }
  }

  if (faixa === '22+') {
    return { ...base, decisao: 'aprovado', motivo: null }
  }
  if (faixa === '16-21') {
    return { ...base, decisao: 'requer_declaracao', motivo: null }
  }
  return { ...base, decisao: 'recusado', motivo: 'faixa_etaria_minor' }
}

export const TAMPER_AGE_DELTA = 10
export const TAMPER_LIVENESS_DELTA = 0.3

export function detectTamper(client: ServerFeatures, server: ServerFeatures): boolean {
  const ageDelta = Math.abs(client.age - server.age)
  const livenessDelta = Math.abs(client.livenessScore - server.livenessScore)
  return ageDelta > TAMPER_AGE_DELTA || livenessDelta > TAMPER_LIVENESS_DELTA
}
