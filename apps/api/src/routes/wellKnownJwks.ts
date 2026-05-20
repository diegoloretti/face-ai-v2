import type { Hono } from 'hono'
import type { JwtService } from '../services/jwt.js'

export function mountWellKnownJwks(app: Hono, jwt: JwtService): void {
  app.get('/.well-known/jwks.json', async (c) => {
    const jwks = await jwt.getJwks()
    c.header('Cache-Control', 'public, max-age=3600')
    return c.json(jwks)
  })
}
