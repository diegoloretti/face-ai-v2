import { z } from 'zod'

export const EnvSchema = z.object({
  PORT: z
    .string()
    .default('8080')
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().int().min(1).max(65535)),
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  JWT_PRIVATE_KEY_PEM: z.string().min(50),
  JWT_PUBLIC_KEY_PEM: z.string().min(50),
  ALLOWED_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
})

export type Env = z.infer<typeof EnvSchema>

export function loadEnv(): Env {
  return EnvSchema.parse({
    PORT: process.env.PORT,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT_PRIVATE_KEY_PEM: process.env.JWT_PRIVATE_KEY_PEM,
    JWT_PUBLIC_KEY_PEM: process.env.JWT_PUBLIC_KEY_PEM,
    ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN,
  })
}
