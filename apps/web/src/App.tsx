import { sanitizeLocal } from '@face-ai/shared'

export function App() {
  const local = sanitizeLocal(new URLSearchParams(window.location.search).get('local'))
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-bold tracking-tight text-accent-cyan">face-ai v2</h1>
      <p className="text-sm text-muted">
        Local: <span className="text-accent-pink">{local}</span>
      </p>
      <p className="text-xs text-muted">scaffold OK - próxima fase: telas, câmera, Human</p>
    </main>
  )
}
