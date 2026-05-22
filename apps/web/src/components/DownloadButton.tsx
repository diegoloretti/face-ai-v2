import { Icon } from './Icon'

export function DownloadButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btn-primary btn-lg" onClick={onClick}>
      <Icon.download style={{ width: 16, height: 16 }} aria-hidden="true" />
      Baixar comprovante
    </button>
  )
}
