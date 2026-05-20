import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Instructions } from './Instructions'

describe('Instructions', () => {
  it('renderiza dicas para boa captura', () => {
    render(<Instructions onProceed={() => {}} />)
    expect(screen.getByText(/iluminação/i)).toBeInTheDocument()
    expect(screen.getByText(/sozinho/i)).toBeInTheDocument()
  })

  it('chama onProceed ao clicar em Continuar', async () => {
    const onProceed = vi.fn()
    render(<Instructions onProceed={onProceed} />)
    await userEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(onProceed).toHaveBeenCalledTimes(1)
  })
})
