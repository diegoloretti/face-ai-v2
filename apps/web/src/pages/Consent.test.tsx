import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Consent } from './Consent'

describe('Consent', () => {
  it('renderiza textos de consentimento em PT-BR', () => {
    render(
      <Consent
        onAccept={() => {}}
        onReject={() => {}}
        onViewPrivacy={() => {}}
      />
    )
    expect(screen.getByText(/verificação de idade/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aceitar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /recusar/i })).toBeInTheDocument()
  })

  it('chama onAccept ao clicar em Aceitar', async () => {
    const onAccept = vi.fn()
    render(
      <Consent
        onAccept={onAccept}
        onReject={() => {}}
        onViewPrivacy={() => {}}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /aceitar/i }))
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('chama onReject ao clicar em Recusar', async () => {
    const onReject = vi.fn()
    render(
      <Consent
        onAccept={() => {}}
        onReject={onReject}
        onViewPrivacy={() => {}}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /recusar/i }))
    expect(onReject).toHaveBeenCalledTimes(1)
  })

  it('link de política de privacidade chama onViewPrivacy', async () => {
    const onViewPrivacy = vi.fn()
    render(
      <Consent
        onAccept={() => {}}
        onReject={() => {}}
        onViewPrivacy={onViewPrivacy}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /política de privacidade/i }))
    expect(onViewPrivacy).toHaveBeenCalledTimes(1)
  })
})
