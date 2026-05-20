import { cors } from 'hono/cors'
import type { MiddlewareHandler } from 'hono'

export function buildCors(allowedOrigins: string[]): MiddlewareHandler {
  return cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
}
