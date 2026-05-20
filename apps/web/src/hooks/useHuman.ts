import { useEffect, useState } from 'react'
import { Human, type Config } from '@vladmandic/human'

let singletonPromise: Promise<Human> | null = null

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
    attention: { enabled: false }
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false }
}

// Singleton lazy: garante que load+warmup so acontecem uma vez,
// mesmo que varios componentes chamem useHuman() simultaneamente.
function getHumanInstance(): Promise<Human> {
  if (singletonPromise) return singletonPromise
  singletonPromise = (async () => {
    const instance = new Human(humanConfig)
    await instance.load()
    await instance.warmup()
    return instance
  })()
  return singletonPromise
}

export function useHuman(enabled: boolean = true): {
  human: Human | null
  isLoading: boolean
  error: Error | null
} {
  const [human, setHuman] = useState<Human | null>(null)
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
