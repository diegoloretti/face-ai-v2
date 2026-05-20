export type ErrorCode =
  | 'invalid_payload'
  | 'photo_too_large'
  | 'photo_wrong_type'
  | 'no_face'
  | 'multiple_faces'
  | 'liveness_fail'
  | 'antispoof_fail'
  | 'rate_limit'
  | 'invalid_jwt'
  | 'jwt_expired'
  | 'jwt_decision_mismatch'
  | 'session_mismatch'
  | 'internal'

export class HttpError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly detail?: Record<string, unknown>

  constructor(status: number, code: ErrorCode, detail?: Record<string, unknown>) {
    super(code)
    this.status = status
    this.code = code
    this.detail = detail
  }
}

export function isHttpError(value: unknown): value is HttpError {
  return value instanceof HttpError
}
