import { describe, it, expect } from 'vitest'
import { app } from './app.js'

describe('face-ai API skeleton', () => {
  it('GET / retorna 200 com mensagem hello', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ message: 'face-ai api v2', status: 'ok' })
  })

  it('GET /unknown retorna 404', async () => {
    const res = await app.request('/unknown')
    expect(res.status).toBe(404)
  })
})
