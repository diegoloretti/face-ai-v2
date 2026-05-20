export { sanitizeLocal } from './lib/sanitize.js'
export { classifyAge, type AgeTier } from './lib/ageClassifier.js'
export { ClientFeaturesSchema, type ClientFeatures } from './schemas/client-features.js'
export { VerifyResponseSchema, type VerifyResponse } from './schemas/verify-response.js'
export {
  VerifyDeclarationRequestSchema,
  type VerifyDeclarationRequest,
  VerifyDeclarationResponseSchema,
  type VerifyDeclarationResponse,
} from './schemas/verify-declaration.js'
export { JwtPayloadSchema, type JwtPayload } from './schemas/jwt-payload.js'
export { VerificationJsonSchema, type VerificationJson } from './schemas/verification-json.js'
