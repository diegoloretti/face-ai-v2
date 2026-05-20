import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DownloadButton } from './DownloadButton'

describe('DownloadButton', () => {
  it('renderiza texto "Baixar comprovante"', () => {
    render(<DownloadButton onClick={() => {}} />)
    expect(screen.getByRole('button', { name: /baixar comprovante/i })).toBeInTheDocument()
  })

  it('chama onClick ao clicar', async () => {
    const onClick = vi.fn()
    render(<DownloadButton onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: /baixar comprovante/i }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
