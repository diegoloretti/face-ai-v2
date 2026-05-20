import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose'

const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true })
const privPem = await exportPKCS8(privateKey)
const pubPem = await exportSPKI(publicKey)

console.log('--- chave privada (copiar pra JWT_PRIVATE_KEY_PEM, manter SECRETA) ---')
console.log(privPem)
console.log('--- chave pública (copiar pra JWT_PUBLIC_KEY_PEM, ok ficar exposta via JWKS) ---')
console.log(pubPem)
console.log('\nFormato pra .env.local (newlines escapados):')
console.log(`JWT_PRIVATE_KEY_PEM="${privPem.replace(/\n/g, '\\n').trim()}"`)
console.log(`JWT_PUBLIC_KEY_PEM="${pubPem.replace(/\n/g, '\\n').trim()}"`)
