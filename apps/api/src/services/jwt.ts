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
  let s = raw.trim()
  // Strip outer quotes preserved by env-file/secret loaders
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1)
  }
  // If it doesn't look like a PEM, assume base64-encoded PEM and decode.
  // (flyctl secrets import mangles literal `\n` in env-file values, so base64 is the safe channel.)
  if (!s.includes('-----BEGIN')) {
    s = Buffer.from(s, 'base64').toString('utf8').trim()
  }
  // Convert literal `\n` escapes to real newlines (jose v5 requires real newlines in PEM)
  if (s.includes('\\n')) {
    s = s.replace(/\\n/g, '\n')
  }
  return s
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
