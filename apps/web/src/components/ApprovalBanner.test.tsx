import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ApprovalBanner } from './ApprovalBanner'

describe('ApprovalBanner', () => {
  it('renderiza "APROVADO" para decisão aprovado', () => {
    render(<ApprovalBanner decisao="aprovado" />)
    expect(screen.getByText(/aprovado/i)).toBeInTheDocument()
  })

  it('renderiza "APROVADO COM DECLARAÇÃO" para aprovado_com_declaracao', () => {
    render(<ApprovalBanner decisao="aprovado_com_declaracao" />)
    expect(screen.getByText(/aprovado com declaração/i)).toBeInTheDocument()
  })

  it('renderiza "RECUSADO" para decisão recusado', () => {
    render(<ApprovalBanner decisao="recusado" />)
    expect(screen.getByText(/recusado/i)).toBeInTheDocument()
  })
})
