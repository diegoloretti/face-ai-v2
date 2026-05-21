import { describe, it, expect, vi } from 'vitest'
import { buildTelemetryRow, persistTelemetry } from './scoresTelemetry.js'
import type { Decision } from './decisionEngine.js'

function decisionMock(overrides: Partial<Decision> = {}): Decision {
  return {
    decisao: 'aprovado',
    faixa_etaria: '22+',
    motivo: null,
    scores: {
      composite: 0.82,
      antiSpoof: 0.95,
      liveness: 0.9,
      faceDetection: 0.99,
      blinkDetected: false,
    },
    flags: {
      failed_liveness: false,
      failed_antispoof: false,
      failed_composite_shadow: false,
      failed_blink: false,
    },
    ...overrides,
  }
}

describe('buildTelemetryRow', () => {
  it('mapeia campos corretos da Decision', () => {
    const row = buildTelemetryRow('abc-uuid', decisionMock(), 30, 'legacy_and')
    expect(row.session_id).toBe('abc-uuid')
    expect(row.age).toBe(30)
    expect(row.anti_spoof_score).toBe(0.95)
    expect(row.liveness_score).toBe(0.9)
    expect(row.face_detection_score).toBe(0.99)
    expect(row.composite_score).toBe(0.82)
    expect(row.blink_detected).toBe(false)
    expect(row.failed_liveness).toBe(false)
    expect(row.decisao).toBe('aprovado')
    expect(row.motivo).toBeNull()
    expect(row.faixa_etaria).toBe('22+')
    expect(row.decision_mode).toBe('legacy_and')
  })

  it('inclui flags individuais quando recusado', () => {
    const row = buildTelemetryRow(
      'xyz',
      decisionMock({
        decisao: 'recusado',
        motivo: 'antispoof_fail',
        flags: {
          failed_liveness: false,
          failed_antispoof: true,
          failed_composite_shadow: true,
          failed_blink: false,
        },
      }),
      30,
      'legacy_and',
    )
    expect(row.failed_antispoof).toBe(true)
    expect(row.failed_composite_shadow).toBe(true)
    expect(row.motivo).toBe('antispoof_fail')
  })
})

function makeLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

function makeSupabaseMock(insertResult: { error: { message: string } | null }) {
  const insert = vi.fn().mockResolvedValue(insertResult)
  return {
    from: vi.fn().mockReturnValue({ insert }),
    __insertSpy: insert,
  }
}

const sampleRow = buildTelemetryRow('s1', {
  decisao: 'aprovado',
  faixa_etaria: '22+',
  motivo: null,
  scores: { composite: 0.8, antiSpoof: 0.9, liveness: 0.9, faceDetection: 0.9, blinkDetected: false },
  flags: { failed_liveness: false, failed_antispoof: false, failed_composite_shadow: false, failed_blink: false },
}, 30, 'legacy_and')

describe('persistTelemetry', () => {
  it('chama supabase.from("verification_scores").insert(row)', async () => {
    const supabase = makeSupabaseMock({ error: null })
    const logger = makeLogger()
    persistTelemetry(supabase as never, sampleRow, logger)
    // fire-and-forget: aguardar microtask pra promise resolver
    await new Promise((r) => setImmediate(r))
    expect(supabase.from).toHaveBeenCalledWith('verification_scores')
    expect(supabase.__insertSpy).toHaveBeenCalledWith(sampleRow)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('loga warn quando insert retorna error', async () => {
    const supabase = makeSupabaseMock({ error: { message: 'rls denied' } })
    const logger = makeLogger()
    persistTelemetry(supabase as never, sampleRow, logger)
    await new Promise((r) => setImmediate(r))
    expect(logger.warn).toHaveBeenCalledWith(
      'verification_scores insert failed',
      expect.objectContaining({ sessionId: 's1', error: 'rls denied' }),
    )
  })

  it('loga warn quando insert promise rejeita (async throw)', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockRejectedValue(new Error('network')),
      }),
    }
    const logger = makeLogger()
    persistTelemetry(supabase as never, sampleRow, logger)
    await new Promise((r) => setImmediate(r))
    expect(logger.warn).toHaveBeenCalledWith(
      'verification_scores insert threw',
      expect.objectContaining({ sessionId: 's1' }),
    )
  })

  it('loga warn quando supabase.from() lança SINCRONAMENTE (sync throw)', () => {
    // Codex round 4 finding: throw sincrono em from() ou insert() escapa do
    // .catch() porque nao chega a virar promise. try/catch externo deve pegar.
    const supabase = {
      from: vi.fn().mockImplementation(() => {
        throw new Error('client not initialized')
      }),
    }
    const logger = makeLogger()
    expect(() => persistTelemetry(supabase as never, sampleRow, logger)).not.toThrow()
    expect(logger.warn).toHaveBeenCalledWith(
      'verification_scores insert sync throw',
      expect.objectContaining({ sessionId: 's1' }),
    )
  })

  it('loga warn quando insert() lança sincronamente após from()', () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockImplementation(() => {
          throw new Error('schema mismatch sync')
        }),
      }),
    }
    const logger = makeLogger()
    expect(() => persistTelemetry(supabase as never, sampleRow, logger)).not.toThrow()
    expect(logger.warn).toHaveBeenCalledWith(
      'verification_scores insert sync throw',
      expect.objectContaining({ sessionId: 's1' }),
    )
  })

  it('retorna void (não espera)', () => {
    const supabase = makeSupabaseMock({ error: null })
    const logger = makeLogger()
    const result = persistTelemetry(supabase as never, sampleRow, logger)
    expect(result).toBeUndefined()
  })
})
