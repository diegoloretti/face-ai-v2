import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlinkChallenge } from './BlinkChallenge'

describe('BlinkChallenge', () => {
  it('renderiza contador 0/2 inicial', () => {
    render(<BlinkChallenge count={0} required={2} status="waiting" />)
    expect(screen.getByText(/0\s*\/\s*2/)).toBeInTheDocument()
  })

  it('renderiza contador 1/2 quando count=1', () => {
    render(<BlinkChallenge count={1} required={2} status="waiting" />)
    expect(screen.getByText(/1\s*\/\s*2/)).toBeInTheDocument()
  })

  it('renderiza check ✓ quando status complete', () => {
    render(<BlinkChallenge count={2} required={2} status="complete" />)
    expect(screen.getByText(/✓/)).toBeInTheDocument()
  })

  it('renderiza mensagem de timeout quando status timeout', () => {
    render(<BlinkChallenge count={0} required={2} status="timeout" />)
    expect(screen.getByText(/tempo esgotado/i)).toBeInTheDocument()
  })

  it('instrução em PT-BR pede pra piscar duas vezes', () => {
    render(<BlinkChallenge count={0} required={2} status="waiting" />)
    expect(screen.getByText(/pisque/i)).toBeInTheDocument()
  })

  it('mostra botão "Tentar de novo" quando status timeout e onRetry fornecido', () => {
    render(<BlinkChallenge count={0} required={2} status="timeout" onRetry={() => {}} />)
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
  })

  it('não mostra botão "Tentar de novo" quando status timeout mas onRetry ausente', () => {
    render(<BlinkChallenge count={0} required={2} status="timeout" />)
    expect(screen.queryByRole('button', { name: /tentar de novo/i })).not.toBeInTheDocument()
  })

  it('chama onRetry quando botão "Tentar de novo" clicado', async () => {
    const onRetry = vi.fn()
    render(<BlinkChallenge count={0} required={2} status="timeout" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /tentar de novo/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
