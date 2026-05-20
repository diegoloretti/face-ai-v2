import { describe, it, expect, vi, afterEach } from 'vitest'
import { createLogger } from './log.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createLogger', () => {
  it('emite JSON em uma linha com ts/level/msg/correlationId', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const log = createLogger({ correlationId: 'cid-123' })
    log.info('hello', { foo: 'bar' })
    expect(spy).toHaveBeenCalledOnce()
    const [line] = spy.mock.calls[0]
    const parsed = JSON.parse(String(line).trim())
    expect(parsed.level).toBe('info')
    expect(parsed.msg).toBe('hello')
    expect(parsed.correlationId).toBe('cid-123')
    expect(parsed.foo).toBe('bar')
    expect(typeof parsed.ts).toBe('string')
  })

  it('error inclui stack quando recebe Error', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const log = createLogger({ correlationId: 'cid-err' })
    log.error('boom', new Error('detail'))
    const parsed = JSON.parse(String(spy.mock.calls[0][0]).trim())
    expect(parsed.level).toBe('error')
    expect(parsed.error.message).toBe('detail')
    expect(parsed.error.stack).toContain('Error: detail')
  })
})
