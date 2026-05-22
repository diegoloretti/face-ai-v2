import { z } from 'zod'

const numberInUnit = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .pipe(
    z
      .number()
      .refine(Number.isFinite, 'must be finite (no NaN/Infinity)')
      .refine((n) => n >= 0 && n <= 1, 'must be between 0 and 1'),
  )

const booleanFromString = z
  .union([z.string(), z.boolean()])
  .transform((v) => {
    if (typeof v === 'boolean') return v
    return v === 'true' || v === '1'
  })

export const EnvSchema = z
  .object({
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
    LIVENESS_THRESHOLD: numberInUnit.default(0.8),
    ANTISPOOF_THRESHOLD: numberInUnit.default(0.85),
    FACE_DETECTION_THRESHOLD: numberInUnit.default(0),
    COMPOSITE_W_ANTISPOOF: numberInUnit.default(0.4),
    COMPOSITE_W_LIVENESS: numberInUnit.default(0.4),
    COMPOSITE_W_FACE_DETECTION: numberInUnit.default(0.2),
    COMPOSITE_THRESHOLD_SHADOW: numberInUnit.default(0.78),
    DECISION_MODE: z.enum(['legacy_and', 'composite']).default('legacy_and'),
    REQUIRE_BLINK: booleanFromString.default(false),
    ADMIN_METRICS_TOKEN: z
      .string()
      .optional()
      .transform((v) => {
        const t = v?.trim()
        return t && t.length > 0 ? t : undefined
      })
      .refine(
        (v) => v === undefined || v.length >= 32,
        'ADMIN_METRICS_TOKEN must be at least 32 chars after trim, or unset',
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
    LIVENESS_THRESHOLD: process.env.LIVENESS_THRESHOLD,
    ANTISPOOF_THRESHOLD: process.env.ANTISPOOF_THRESHOLD,
    FACE_DETECTION_THRESHOLD: process.env.FACE_DETECTION_THRESHOLD,
    COMPOSITE_W_ANTISPOOF: process.env.COMPOSITE_W_ANTISPOOF,
    COMPOSITE_W_LIVENESS: process.env.COMPOSITE_W_LIVENESS,
    COMPOSITE_W_FACE_DETECTION: process.env.COMPOSITE_W_FACE_DETECTION,
    COMPOSITE_THRESHOLD_SHADOW: process.env.COMPOSITE_THRESHOLD_SHADOW,
    DECISION_MODE: process.env.DECISION_MODE,
    REQUIRE_BLINK: process.env.REQUIRE_BLINK,
    ADMIN_METRICS_TOKEN: process.env.ADMIN_METRICS_TOKEN,
  })
}
