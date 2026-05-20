import { cp, mkdir, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../web/public/models')
const dst = resolve(here, '../models')

await mkdir(dst, { recursive: true })
const files = await readdir(src)
for (const f of files) {
  await cp(join(src, f), join(dst, f))
}
console.log(`[copy-models] ${files.length} arquivos copiados de ${src} para ${dst}`)
