export function DownloadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border border-accent-cyan bg-transparent px-6 py-2 font-mono text-accent-cyan transition hover:bg-accent-cyan hover:text-bg"
    >
      Baixar comprovante
    </button>
  )
}
