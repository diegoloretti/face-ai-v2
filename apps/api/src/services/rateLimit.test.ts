import { describe, it, expect, vi } from 'vitest'
import { checkRateLimit, LIMITS, WINDOW_MS } from './rateLimit.js'

function makeClient(rpcResult: { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
  }
}

describe('checkRateLimit', () => {
  it('permite quando current_count dentro do limite', async () => {
    const client = makeClient({
      data: [{ current_count: 5, window_remaining_ms: 1000 }],
      error: null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await checkRateLimit(client as any, 'ip-hash', 'verify')
    expect(r.ok).toBe(true)
    expect(client.rpc).toHaveBeenCalledWith('increment_rate_limit', {
      p_bucket_key: 'ip-hash:verify',
      p_window_ms: WINDOW_MS,
    })
  })

  it('bloqueia quando current_count excede limite do endpoint', async () => {
    const client = makeClient({
      data: [{ current_count: LIMITS.verify + 1, window_remaining_ms: 1234 }],
      error: null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await checkRateLimit(client as any, 'ip-hash', 'verify')
    expect(r.ok).toBe(false)
    expect(r.retryAfter).toBe(1234)
  })

  it('fail-open quando RPC retorna erro', async () => {
    const client = makeClient({ data: null, error: { message: 'boom' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await checkRateLimit(client as any, 'ip-hash', 'verify')
    expect(r.ok).toBe(true)
    expect(r.retryAfter).toBe(0)
  })

  it('verify-jwt usa limite maior', async () => {
    const client = makeClient({
      data: [{ current_count: 100, window_remaining_ms: 0 }],
      error: null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await checkRateLimit(client as any, 'ip-hash', 'verify-jwt')
    expect(r.ok).toBe(true)
  })
})
