import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { mountMetricsBlinkDebug } from './metricsBlinkDebug.js'

function makeLogger() {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

const VALID_SESSION = '11111111-2222-3333-4444-555555555555'

describe('mountMetricsBlinkDebug', () => {
  it('aceita payload válido e loga via info', async () => {
    const app = new Hono()
    const logger = makeLogger()
    mountMetricsBlinkDebug(app, { logger })
    const res = await app.request('/metrics/blink-debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: VALID_SESSION,
        outcome: 'completed',
        baseline: 0.38,
        thresholdClosed: 0.266,
        leftMin: 0.19,
        leftMax: 0.42,
        rightMin: 0.2,
        rightMax: 0.41,
        blinkCount: 2,
        frames: 35,
        elapsedMs: 4500,
      }),
    })
    expect(res.status).toBe(200)
    expect(logger.info).toHaveBeenCalledWith(
      'blink_debug',
      expect.objectContaining({
        sessionId: VALID_SESSION,
        outcome: 'completed',
        blinkCount: 2,
      }),
    )
  })

  it('aceita outcome=timeout sem campos opcionais', async () => {
    const app = new Hono()
    const logger = makeLogger()
    mountMetricsBlinkDebug(app, { logger })
    const res = await app.request('/metrics/blink-debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: VALID_SESSION, outcome: 'timeout' }),
    })
    expect(res.status).toBe(200)
    expect(logger.info).toHaveBeenCalled()
  })

  it('rejeita payload sem sessionId', async () => {
    const app = new Hono()
    mountMetricsBlinkDebug(app, { logger: makeLogger() })
    const res = await app.request('/metrics/blink-debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: 'completed' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejeita outcome desconhecido', async () => {
    const app = new Hono()
    mountMetricsBlinkDebug(app, { logger: makeLogger() })
    const res = await app.request('/metrics/blink-debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: VALID_SESSION, outcome: 'foo' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejeita campos extras (strict)', async () => {
    const app = new Hono()
    mountMetricsBlinkDebug(app, { logger: makeLogger() })
    const res = await app.request('/metrics/blink-debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: VALID_SESSION,
        outcome: 'completed',
        unknownField: 'abuse',
      }),
    })
    expect(res.status).toBe(400)
  })

  it('rejeita body grande via content-length', async () => {
    const app = new Hono()
    mountMetricsBlinkDebug(app, { logger: makeLogger() })
    const res = await app.request('/metrics/blink-debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'content-length': String(10 * 1024),
      },
      body: JSON.stringify({ sessionId: VALID_SESSION, outcome: 'completed' }),
    })
    expect(res.status).toBe(413)
  })
})
