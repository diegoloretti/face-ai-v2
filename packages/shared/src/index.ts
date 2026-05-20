export { sanitizeLocal } from './lib/sanitize'
export { classifyAge, type AgeTier } from './lib/ageClassifier'
export {
  ClientFeaturesSchema,
  type ClientFeatures
} from './schemas/client-features'
export {
  VerifyResponseSchema,
  type VerifyResponse
} from './schemas/verify-response'
export {
  VerifyDeclarationRequestSchema,
  type VerifyDeclarationRequest,
  VerifyDeclarationResponseSchema,
  type VerifyDeclarationResponse
} from './schemas/verify-declaration'
export { JwtPayloadSchema, type JwtPayload } from './schemas/jwt-payload'
export {
  VerificationJsonSchema,
  type VerificationJson
} from './schemas/verification-json'
