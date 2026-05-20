import { z } from 'zod'

export const VerificationJsonSchema = z.object({
  schema_version: z.literal('2.0'),
  session_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  local: z.string().max(50),
  decisao: z.enum([
    'aprovado',
    'recusado',
    'requer_declaracao',
    'aprovado_com_declaracao',
    'recusado_inicial'
  ]),
  faixa_etaria: z.enum(['<13', '13-15', '16-21', '22+']).nullable(),
  motivo: z.string().nullable(),
  declaracao: z
    .object({
      declarou: z.boolean(),
      timestamp_declaracao: z.string().datetime()
    })
    .nullable(),
  jwt: z.string().nullable()
})

export type VerificationJson = z.infer<typeof VerificationJsonSchema>
