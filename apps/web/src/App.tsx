import { sanitizeLocal } from '@face-ai/shared'

export function App() {
  const local = sanitizeLocal(new URLSearchParams(window.location.search).get('local'))
  return (
    <main>
      <h1>face-ai v2</h1>
      <p>Local: {local}</p>
    </main>
  )
}
