import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renderiza texto recebido', () => {
    render(<StatusBadge tone="info">Aguardando câmera</StatusBadge>)
    expect(screen.getByText('Aguardando câmera')).toBeInTheDocument()
  })

  it('aplica classe de cor cyan para tone info', () => {
    render(<StatusBadge tone="info">teste</StatusBadge>)
    expect(screen.getByText('teste')).toHaveClass('text-accent-cyan')
  })

  it('aplica classe de cor pink para tone error', () => {
    render(<StatusBadge tone="error">erro</StatusBadge>)
    expect(screen.getByText('erro')).toHaveClass('text-accent-pink')
  })
})
