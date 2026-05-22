import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ApprovalBanner } from './ApprovalBanner'

describe('ApprovalBanner', () => {
  it('renderiza "Verificação aprovada" para decisão aprovado', () => {
    render(<ApprovalBanner decisao="aprovado" />)
    expect(screen.getByRole('heading', { name: /verificação aprovada$/i })).toBeInTheDocument()
  })

  it('renderiza "Verificação aprovada com declaração" para aprovado_com_declaracao', () => {
    render(<ApprovalBanner decisao="aprovado_com_declaracao" />)
    expect(
      screen.getByRole('heading', { name: /verificação aprovada com declaração/i }),
    ).toBeInTheDocument()
  })

  it('renderiza "Verificação não aprovada" para decisão recusado', () => {
    render(<ApprovalBanner decisao="recusado" />)
    expect(screen.getByRole('heading', { name: /verificação não aprovada/i })).toBeInTheDocument()
  })
})
