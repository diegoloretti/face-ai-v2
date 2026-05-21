import { z } from 'zod'

export const ClientFeaturesSchema = z.object({
  age: z.number().min(0).max(120),
  antiSpoofScore: z.number().min(0).max(1),
  livenessScore: z.number().min(0).max(1),
  faceDetectionScore: z.number().min(0).max(1),
  blinkDetected: z.boolean().optional().default(false),
})

export type ClientFeatures = z.infer<typeof ClientFeaturesSchema>
