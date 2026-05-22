import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { VerifyResponse } from '@face-ai/shared'
import { Result } from './Result'

const aprovado: VerifyResponse = {
  decisao: 'aprovado',
  faixa_etaria: '22+',
  jwt: 'mock-jwt-1',
  motivo: null,
  tamper_detected: false,
}

const requerDeclaracao: VerifyResponse = {
  decisao: 'requer_declaracao',
  faixa_etaria: '16-21',
  jwt: 'mock-jwt-3',
  motivo: null,
  tamper_detected: false,
}

const recusado: VerifyResponse = {
  decisao: 'recusado',
  faixa_etaria: '13-15',
  jwt: 'mock-jwt-2',
  motivo: 'faixa_etaria_minor',
  tamper_detected: false,
}

describe('Result', () => {
  it('renderiza ApprovalBanner com decisão aprovado', () => {
    render(
      <Result
        response={aprovado}
        declarationConfirmed={false}
        onRetry={() => {}}
        onRestart={() => {}}
      />,
    )
    expect(screen.getByRole('heading', { name: /verificação aprovada$/i })).toBeInTheDocument()
  })

  it('renderiza ApprovalBanner com decisão aprovado_com_declaracao quando declarationConfirmed=true', () => {
    render(
      <Result
        response={requerDeclaracao}
        declarationConfirmed={true}
        onRetry={() => {}}
        onRestart={() => {}}
      />,
    )
    expect(
      screen.getByRole('heading', { name: /verificação aprovada com declaração/i }),
    ).toBeInTheDocument()
  })

  it('renderiza motivo da recusa em PT-BR quando recusado', () => {
    render(
      <Result
        response={recusado}
        declarationConfirmed={false}
        onRetry={() => {}}
        onRestart={() => {}}
      />,
    )
    expect(screen.getByText(/estimada abaixo do permitido/i)).toBeInTheDocument()
  })

  it('botão "Voltar ao início" chama onRestart', async () => {
    const onRestart = vi.fn()
    render(
      <Result
        response={aprovado}
        declarationConfirmed={false}
        onRetry={() => {}}
        onRestart={onRestart}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /voltar ao início/i }))
    expect(onRestart).toHaveBeenCalledTimes(1)
  })

  it('botão "Nova verificação" chama onRetry', async () => {
    const onRetry = vi.fn()
    render(
      <Result
        response={aprovado}
        declarationConfirmed={false}
        onRetry={onRetry}
        onRestart={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /nova verificação/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('não renderiza botão de baixar comprovante', () => {
    render(
      <Result
        response={aprovado}
        declarationConfirmed={false}
        onRetry={() => {}}
        onRestart={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /baixar/i })).not.toBeInTheDocument()
  })
})
