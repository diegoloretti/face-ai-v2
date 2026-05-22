import { describe, it, expect, vi } from 'vitest'
import { checkCompositeWeightsSum } from './compositeWeightsCheck.js'
import type { Env } from '../env.js'

function makeLogger() {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

function envWith(w: { a: number; l: number; f: number }): Env {
  return {
    COMPOSITE_W_ANTISPOOF: w.a,
    COMPOSITE_W_LIVENESS: w.l,
    COMPOSITE_W_FACE_DETECTION: w.f,
  } as unknown as Env
}

describe('checkCompositeWeightsSum', () => {
  it('soma = 1.0 nao warning', () => {
    const log = makeLogger()
    const r = checkCompositeWeightsSum(envWith({ a: 0.4, l: 0.4, f: 0.2 }), log)
    expect(r.warned).toBe(false)
    expect(log.warn).not.toHaveBeenCalled()
  })

  it('soma = 1.0005 dentro da tolerancia, sem warning', () => {
    const log = makeLogger()
    const r = checkCompositeWeightsSum(envWith({ a: 0.4005, l: 0.4, f: 0.2 }), log)
    expect(r.warned).toBe(false)
  })

  it('soma = 0.95 fora da tolerancia, warning', () => {
    const log = makeLogger()
    const r = checkCompositeWeightsSum(envWith({ a: 0.35, l: 0.4, f: 0.2 }), log)
    expect(r.warned).toBe(true)
    expect(log.warn).toHaveBeenCalledOnce()
    const call = log.warn.mock.calls[0]
    expect(call[0]).toMatch(/out of tolerance/)
    expect(call[1].sum).toBeCloseTo(0.95, 5)
  })

  it('soma = 1.5 (warning loud)', () => {
    const log = makeLogger()
    const r = checkCompositeWeightsSum(envWith({ a: 0.5, l: 0.5, f: 0.5 }), log)
    expect(r.warned).toBe(true)
    expect(log.warn).toHaveBeenCalledOnce()
  })
})
