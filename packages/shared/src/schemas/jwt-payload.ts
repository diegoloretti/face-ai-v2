import { z } from 'zod'

export const JwtPayloadSchema = z.object({
  iss: z.literal('face-ai-v2'),
  sub: z.uuid(),
  iat: z.number().int(),
  exp: z.number().int(),
  jti: z.uuid(),
  decisao: z.enum(['aprovado', 'recusado', 'requer_declaracao', 'aprovado_com_declaracao']),
  faixa_etaria: z.enum(['<13', '13-15', '16-21', '22+']),
  local: z.string().max(50),
  declaracao: z
    .object({
      declarou: z.boolean(),
      timestamp: z.iso.datetime()
    })
    .nullable(),
  tamper_flag: z.boolean()
})

export type JwtPayload = z.infer<typeof JwtPayloadSchema>
