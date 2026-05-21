import { describe, it, expect } from 'vitest'
import { ClientFeaturesSchema } from './client-features.js'

describe('ClientFeaturesSchema', () => {
  it('aceita payload sem blinkDetected (default false)', () => {
    const parsed = ClientFeaturesSchema.parse({
      age: 30,
      antiSpoofScore: 0.9,
      livenessScore: 0.85,
      faceDetectionScore: 0.95,
    })
    expect(parsed.blinkDetected).toBe(false)
  })

  it('aceita blinkDetected: true', () => {
    const parsed = ClientFeaturesSchema.parse({
      age: 30,
      antiSpoofScore: 0.9,
      livenessScore: 0.85,
      faceDetectionScore: 0.95,
      blinkDetected: true,
    })
    expect(parsed.blinkDetected).toBe(true)
  })

  it('rejeita blinkDetected nao-booleano', () => {
    expect(() =>
      ClientFeaturesSchema.parse({
        age: 30,
        antiSpoofScore: 0.9,
        livenessScore: 0.85,
        faceDetectionScore: 0.95,
        blinkDetected: 'yes',
      }),
    ).toThrow()
  })
})
