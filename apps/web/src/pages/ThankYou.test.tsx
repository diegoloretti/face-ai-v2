import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThankYou } from './ThankYou'

describe('ThankYou', () => {
  it('renderiza mensagem de despedida em PT-BR', () => {
    render(<ThankYou reason="initial_refusal" />)
    expect(screen.getByText(/obrigado/i)).toBeInTheDocument()
  })

  it('mostra motivo específico para declaration_refused', () => {
    render(<ThankYou reason="declaration_refused" />)
    expect(screen.getByText(/declaração não confirmada/i)).toBeInTheDocument()
  })
})
