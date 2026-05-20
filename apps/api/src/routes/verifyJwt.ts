import type { Hono } from 'hono'
import { errors } from 'jose'
import type { JwtService } from '../services/jwt.js'

export function mountVerifyJwt(app: Hono, jwt: JwtService): void {
  app.get('/verify-jwt', async (c) => {
    const token = c.req.query('token')
    if (!token) {
      return c.json({ error: 'invalid_payload', issues: [{ path: ['token'], message: 'required' }] }, 400)
    }
    try {
      const payload = await jwt.verify(token)
      return c.json({ valid: true, expired: false, payload })
    } catch (err) {
      const expired = err instanceof errors.JWTExpired
      return c.json({ valid: false, expired, payload: null })
    }
  })
}
