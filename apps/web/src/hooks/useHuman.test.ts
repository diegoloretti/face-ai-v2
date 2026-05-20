import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

describe('useHuman', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('reseta singleton quando load() rejeita, permitindo retry na próxima chamada', async () => {
    let shouldFail = true
    const loadFn = vi.fn(async () => {
      if (shouldFail) throw new Error('boom')
    })
    const warmupFn = vi.fn(async () => {})
    vi.doMock('@vladmandic/human', () => ({
      Human: vi.fn().mockImplementation(() => ({ load: loadFn, warmup: warmupFn })),
    }))

    const { useHuman } = await import('./useHuman')

    const first = renderHook(() => useHuman())
    await waitFor(() => expect(first.result.current.error).not.toBeNull())
    expect(first.result.current.human).toBeNull()

    shouldFail = false

    const second = renderHook(() => useHuman())
    await waitFor(() => expect(second.result.current.human).not.toBeNull())
    expect(second.result.current.error).toBeNull()
    expect(loadFn).toHaveBeenCalledTimes(2)
  })

  it('compartilha mesma instância em chamadas concorrentes quando load() resolve', async () => {
    const loadFn = vi.fn(async () => {})
    const warmupFn = vi.fn(async () => {})
    vi.doMock('@vladmandic/human', () => ({
      Human: vi.fn().mockImplementation(() => ({ load: loadFn, warmup: warmupFn })),
    }))

    const { useHuman } = await import('./useHuman')

    const first = renderHook(() => useHuman())
    const second = renderHook(() => useHuman())

    await waitFor(() => expect(first.result.current.human).not.toBeNull())
    await waitFor(() => expect(second.result.current.human).not.toBeNull())

    expect(first.result.current.human).toBe(second.result.current.human)
    expect(loadFn).toHaveBeenCalledTimes(1)
  })

  it('não inicializa quando enabled=false', async () => {
    const loadFn = vi.fn(async () => {})
    const warmupFn = vi.fn(async () => {})
    vi.doMock('@vladmandic/human', () => ({
      Human: vi.fn().mockImplementation(() => ({ load: loadFn, warmup: warmupFn })),
    }))

    const { useHuman } = await import('./useHuman')
    const { result } = renderHook(() => useHuman(false))
    expect(result.current.human).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(loadFn).not.toHaveBeenCalled()
  })
})
