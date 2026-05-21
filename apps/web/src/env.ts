import { z } from 'zod'

const EnvSchema = z
  .object({
    VITE_API_URL: z.url().default('https://placeholder.invalid'),
    VITE_USE_MOCK_API: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    VITE_REQUIRE_BLINK: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
  })
  .superRefine((data, ctx) => {
    if (!data.VITE_USE_MOCK_API && data.VITE_API_URL === 'https://placeholder.invalid') {
      ctx.addIssue({
        code: 'custom',
        path: ['VITE_API_URL'],
        message: 'VITE_API_URL é obrigatório quando VITE_USE_MOCK_API=false',
      })
    }
  })

export const env = EnvSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_USE_MOCK_API: import.meta.env.VITE_USE_MOCK_API,
  VITE_REQUIRE_BLINK: import.meta.env.VITE_REQUIRE_BLINK,
})
