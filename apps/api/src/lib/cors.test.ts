import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { buildCors } from './cors.js'

function makeApp(origins: string[]) {
  const app = new Hono()
  app.use('*', buildCors(origins))
  app.get('/ping', (c) => c.text('pong'))
  return app
}

describe('buildCors', () => {
  it('aceita origin permitida e ecoa o cabeçalho', async () => {
    const app = makeApp(['http://localhost:5173'])
    const res = await app.request('/ping', {
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })

  it('rejeita origin não listada (sem cabeçalho)', async () => {
    const app = makeApp(['http://localhost:5173'])
    const res = await app.request('/ping', {
      headers: { Origin: 'https://evil.example' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('preflight OPTIONS retorna 204', async () => {
    const app = makeApp(['http://localhost:5173'])
    const res = await app.request('/ping', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
      },
    })
    expect(res.status).toBe(204)
  })
})
