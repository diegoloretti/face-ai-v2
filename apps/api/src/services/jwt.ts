import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  importSPKI,
  exportJWK,
  type KeyLike,
  type JWK,
} from 'jose'
import { JwtPayloadSchema, type JwtPayload } from '@face-ai/shared'

const ALG = 'ES256'
const EXP_SECONDS = 7 * 24 * 3600

export type JwtService = {
  sign: (claims: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>) => Promise<string>
  verify: (token: string) => Promise<JwtPayload>
  getJwks: () => Promise<{ keys: JWK[] }>
}

function normalizePem(raw: string): string {
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw
}

export async function createJwtService(opts: {
  privatePem: string
  publicPem: string
  kid: string
}): Promise<JwtService> {
  const privateKey: KeyLike = await importPKCS8(normalizePem(opts.privatePem), ALG, {
    extractable: false,
  })
  const publicKey: KeyLike = await importSPKI(normalizePem(opts.publicPem), ALG, {
    extractable: true,
  })

  return {
    async sign(claims) {
      const now = Math.floor(Date.now() / 1000)
      const jti = crypto.randomUUID()
      const fullPayload: JwtPayload = {
        ...claims,
        iat: now,
        exp: now + EXP_SECONDS,
        jti,
      }
      JwtPayloadSchema.parse(fullPayload)
      return await new SignJWT({ ...fullPayload })
        .setProtectedHeader({ alg: ALG, kid: opts.kid })
        .sign(privateKey)
    },

    async verify(token) {
      const { payload } = await jwtVerify(token, publicKey, { algorithms: [ALG] })
      return JwtPayloadSchema.parse(payload)
    },

    async getJwks() {
      const jwk = await exportJWK(publicKey)
      return {
        keys: [
          {
            ...jwk,
            kid: opts.kid,
            alg: ALG,
            use: 'sig',
          },
        ],
      }
    },
  }
}
