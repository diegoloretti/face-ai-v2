import { z } from 'zod'

export const VerifyResponseSchema = z.object({
  decisao: z.enum(['aprovado', 'recusado', 'requer_declaracao']),
  faixa_etaria: z.enum(['<13', '13-15', '16-21', '22+']),
  jwt: z.string().min(1),
  motivo: z.string().nullable(),
  tamper_detected: z.boolean()
})

export type VerifyResponse = z.infer<typeof VerifyResponseSchema>
