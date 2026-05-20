import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
