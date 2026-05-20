import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeclarationRequired } from './DeclarationRequired'

describe('DeclarationRequired', () => {
  it('renderiza explicação da faixa 16-21 em PT-BR', () => {
    render(<DeclarationRequired onConfirm={() => {}} onRefuse={() => {}} />)
    expect(screen.getByText(/16.*21/)).toBeInTheDocument()
    expect(screen.getByText(/precisa declarar/i)).toBeInTheDocument()
  })

  it('botão Confirmar começa desabilitado até checkbox marcada', async () => {
    render(<DeclarationRequired onConfirm={() => {}} onRefuse={() => {}} />)
    const confirm = screen.getByRole('button', { name: /confirmar/i })
    expect(confirm).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox'))
    expect(confirm).not.toBeDisabled()
  })

  it('chama onConfirm quando checkbox marcada e Confirmar clicado', async () => {
    const onConfirm = vi.fn()
    render(<DeclarationRequired onConfirm={onConfirm} onRefuse={() => {}} />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('chama onRefuse quando botão Recusar clicado mesmo sem checkbox', async () => {
    const onRefuse = vi.fn()
    render(<DeclarationRequired onConfirm={() => {}} onRefuse={onRefuse} />)
    await userEvent.click(screen.getByRole('button', { name: /não declarar/i }))
    expect(onRefuse).toHaveBeenCalledTimes(1)
  })

  it('botão Confirmar mostra "Confirmando..." e fica disabled quando submitting', async () => {
    render(<DeclarationRequired onConfirm={() => {}} onRefuse={() => {}} submitting />)
    await userEvent.click(screen.getByRole('checkbox'))
    const confirm = screen.getByRole('button', { name: /confirmando/i })
    expect(confirm).toBeDisabled()
  })

  it('não chama onConfirm em cliques repetidos enquanto submitting', async () => {
    const onConfirm = vi.fn()
    render(<DeclarationRequired onConfirm={onConfirm} onRefuse={() => {}} submitting />)
    await userEvent.click(screen.getByRole('checkbox'))
    const confirm = screen.getByRole('button', { name: /confirmando/i })
    await userEvent.click(confirm)
    await userEvent.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
