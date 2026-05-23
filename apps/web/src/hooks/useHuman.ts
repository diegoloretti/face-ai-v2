import { useEffect, useState } from 'react'
import type { Human as HumanInstance, Config } from '@vladmandic/human'

let singletonPromise: Promise<HumanInstance> | null = null

const humanConfig: Partial<Config> = {
  modelBasePath: '/models/',
  backend: 'webgl',
  filter: { enabled: false },
  face: {
    enabled: true,
    detector: { rotation: false, maxDetected: 5 },
    mesh: { enabled: true, modelPath: 'facemesh.json' },
    description: { enabled: true, modelPath: 'faceres.json' },
    antispoof: { enabled: true, modelPath: 'antispoof.json' },
    liveness: { enabled: true, modelPath: 'liveness.json' },
    iris: { enabled: true, modelPath: 'iris.json' },
    emotion: { enabled: false },
    attention: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
}

// Singleton lazy: garante que load+warmup só acontecem uma vez,
// mesmo que vários componentes chamem useHuman() simultaneamente.
function getHumanInstance(): Promise<HumanInstance> {
  if (singletonPromise) return singletonPromise
  singletonPromise = (async () => {
    const { Human } = await import('@vladmandic/human')
    const instance = new Human(humanConfig)
    await instance.load()
    await instance.warmup()
    return instance
  })().catch((err) => {
    singletonPromise = null
    throw err
  })
  return singletonPromise
}

// Aquece o singleton em background enquanto o usuário ainda está em telas
// anteriores à câmera. Evita gargalo de ~25s baixando modelos quando entra
// na tela Camera com conexão lenta.
export function prefetchHuman(): void {
  void getHumanInstance().catch(() => {})
}

export function useHuman(enabled: boolean = true): {
  human: HumanInstance | null
  isLoading: boolean
  error: Error | null
} {
  const [human, setHuman] = useState<HumanInstance | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setError(null)
    getHumanInstance()
      .then((instance) => {
        if (!cancelled) setHuman(instance)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { human, isLoading: enabled && human === null && error === null, error }
}
