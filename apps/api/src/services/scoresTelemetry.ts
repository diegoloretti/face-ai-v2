import type { Decision } from './decisionEngine.js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Logger } from '../lib/log.js'

export type TelemetryRow = {
  session_id: string
  age: number
  anti_spoof_score: number
  liveness_score: number
  face_detection_score: number
  composite_score: number
  blink_detected: boolean
  failed_liveness: boolean
  failed_antispoof: boolean
  failed_composite_shadow: boolean
  failed_blink: boolean
  decisao: string
  motivo: string | null
  faixa_etaria: string
  decision_mode: string
}

export function buildTelemetryRow(
  sessionId: string,
  decision: Decision,
  age: number,
  decisionMode: string,
): TelemetryRow {
  return {
    session_id: sessionId,
    age,
    anti_spoof_score: decision.scores.antiSpoof,
    liveness_score: decision.scores.liveness,
    face_detection_score: decision.scores.faceDetection,
    composite_score: decision.scores.composite,
    blink_detected: decision.scores.blinkDetected,
    failed_liveness: decision.flags.failed_liveness,
    failed_antispoof: decision.flags.failed_antispoof,
    failed_composite_shadow: decision.flags.failed_composite_shadow,
    failed_blink: decision.flags.failed_blink,
    decisao: decision.decisao,
    motivo: decision.motivo,
    faixa_etaria: decision.faixa_etaria,
    decision_mode: decisionMode,
  }
}

export function persistTelemetry(
  supabase: SupabaseClient,
  row: TelemetryRow,
  logger: Logger,
): void {
  // Defesa em duas camadas pra garantir fire-and-forget de verdade:
  // (1) try/catch envolve a chain inteira pra capturar throws SINCRONOS
  //     (supabase.from() ou .insert() lancando antes de retornar promise).
  // (2) .catch() pega rejections assincronas. Sem (1), throw sincrono escapa
  //     e bloqueia /verify.
  try {
    Promise.resolve(supabase.from('verification_scores').insert(row))
      .then(({ error }) => {
        if (error) {
          logger.warn('verification_scores insert failed', {
            sessionId: row.session_id,
            error: error.message,
          })
        }
      })
      .catch((err: unknown) => {
        logger.warn('verification_scores insert threw', {
          sessionId: row.session_id,
          error: String(err),
        })
      })
  } catch (err: unknown) {
    logger.warn('verification_scores insert sync throw', {
      sessionId: row.session_id,
      error: String(err),
    })
  }
}
