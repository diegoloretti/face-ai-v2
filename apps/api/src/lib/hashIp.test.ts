import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { hashIp } from './hashIp.js'

describe('hashIp', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('retorna hex SHA-256 de 64 chars lowercase', async () => {
    vi.setSystemTime(new Date('2026-05-20T10:00:00Z'))
    const hash = await hashIp('192.168.1.1')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('é determinístico dentro do mesmo mês', async () => {
    vi.setSystemTime(new Date('2026-05-20T10:00:00Z'))
    const a = await hashIp('10.0.0.1')
    vi.setSystemTime(new Date('2026-05-25T15:00:00Z'))
    const b = await hashIp('10.0.0.1')
    expect(a).toBe(b)
  })

  it('muda quando o mês UTC vira', async () => {
    vi.setSystemTime(new Date('2026-05-31T23:59:59Z'))
    const may = await hashIp('10.0.0.1')
    vi.setSystemTime(new Date('2026-06-01T00:00:01Z'))
    const jun = await hashIp('10.0.0.1')
    expect(may).not.toBe(jun)
  })

  it('IPs diferentes produzem hashes diferentes no mesmo mês', async () => {
    vi.setSystemTime(new Date('2026-05-20T10:00:00Z'))
    expect(await hashIp('1.1.1.1')).not.toBe(await hashIp('2.2.2.2'))
  })
})
