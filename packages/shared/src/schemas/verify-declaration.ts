import { z } from 'zod'

export const VerifyDeclarationRequestSchema = z.object({
  sessionId: z.string().uuid(),
  previousJwt: z.string().min(1),
  declaroSerMaiorDe18: z.literal(true)
})

export type VerifyDeclarationRequest = z.infer<typeof VerifyDeclarationRequestSchema>

export const VerifyDeclarationResponseSchema = z.object({
  decisao: z.literal('aprovado_com_declaracao'),
  jwt: z.string().min(1),
  timestamp_declaracao: z.string().datetime()
})

export type VerifyDeclarationResponse = z.infer<typeof VerifyDeclarationResponseSchema>
