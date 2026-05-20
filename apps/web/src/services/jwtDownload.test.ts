import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { VerificationJson } from '@face-ai/shared'
import { downloadVerificationJson } from './jwtDownload'

const samplePayload: VerificationJson = {
  schema_version: '2.0',
  session_id: '00000000-0000-4000-8000-000000000000',
  timestamp: '2026-05-20T12:00:00.000Z',
  local: 'demo',
  decisao: 'aprovado',
  faixa_etaria: '22+',
  motivo: null,
  declaracao: null,
  jwt: 'mock-jwt-abc'
}

describe('downloadVerificationJson', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let clickSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    clickSpy = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('cria blob, gera object URL, dispara click e revoga URL após delay', () => {
    downloadVerificationJson(samplePayload)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('nome do arquivo inclui session_id', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    downloadVerificationJson(samplePayload)
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe(`faceai-${samplePayload.session_id}.json`)
  })
})
