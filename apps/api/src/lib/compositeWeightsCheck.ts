import type { Env } from '../env.js'
import type { Logger } from './log.js'

const TOLERANCE = 1e-3

export function checkCompositeWeightsSum(
  env: Env,
  logger: Logger,
): { sum: number; warned: boolean } {
  const sum =
    env.COMPOSITE_W_ANTISPOOF + env.COMPOSITE_W_LIVENESS + env.COMPOSITE_W_FACE_DETECTION
  if (Math.abs(sum - 1) > TOLERANCE) {
    logger.warn(
      'composite weights sum out of tolerance [0.999, 1.001] - decision behavior may diverge from spec',
      {
        sum,
        weights: {
          antispoof: env.COMPOSITE_W_ANTISPOOF,
          liveness: env.COMPOSITE_W_LIVENESS,
          face_detection: env.COMPOSITE_W_FACE_DETECTION,
        },
      },
    )
    return { sum, warned: true }
  }
  return { sum, warned: false }
}
