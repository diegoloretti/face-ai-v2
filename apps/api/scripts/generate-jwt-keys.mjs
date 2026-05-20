import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose'

const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true })
const privPem = await exportPKCS8(privateKey)
const pubPem = await exportSPKI(publicKey)
const privB64 = Buffer.from(privPem).toString('base64')
const pubB64 = Buffer.from(pubPem).toString('base64')

console.log('--- chave privada PEM (informativo, manter SECRETA) ---')
console.log(privPem)
console.log('--- chave pública PEM (informativo, ok ficar exposta via JWKS) ---')
console.log(pubPem)
console.log('')
console.log('=== Pronto pra colar em apps/api/.env.local (base64, sem ambiguidade de newlines) ===')
console.log(`JWT_PRIVATE_KEY_PEM=${privB64}`)
console.log(`JWT_PUBLIC_KEY_PEM=${pubB64}`)
