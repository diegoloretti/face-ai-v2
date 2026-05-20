import { Hono } from 'hono'

export const app = new Hono()

app.get('/', (c) => {
  return c.json({ message: 'face-ai api v2', status: 'ok' })
})
