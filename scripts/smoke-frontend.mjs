import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR ?? join(
  process.env.USERPROFILE ?? process.env.HOME ?? '',
  '.claude/playwright/faceai-v2'
)
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'

async function captureAt(page, name) {
  await page.waitForTimeout(400)
  const file = join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log('  captured:', file)
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    permissions: ['camera']
  })
  const page = await context.newPage()
  page.on('console', (msg) => console.log('  [console]', msg.type(), msg.text()))
  page.on('pageerror', (err) => console.error('  [pageerror]', err.message))

  console.log('→ open Consent')
  await page.goto(`${BASE_URL}?local=demo`)
  await page.getByRole('heading', { name: /FACE\.AI/ }).waitFor({ timeout: 10000 })
  await captureAt(page, '01-consent')

  console.log('→ click "política de privacidade"')
  await page.getByRole('button', { name: /política de privacidade/i }).click()
  await page.getByRole('heading', { name: /política de privacidade/i }).waitFor()
  await captureAt(page, '02-privacy')

  console.log('→ Voltar -> Consent -> Aceitar -> Instructions')
  await page.getByRole('button', { name: /voltar/i }).click()
  await page.getByRole('button', { name: /aceitar e continuar/i }).click()
  await page.getByRole('heading', { name: /antes de começar/i }).waitFor()
  await captureAt(page, '03-instructions')

  console.log('→ Continuar -> Camera (com fake video stream)')
  await page.getByRole('button', { name: /continuar/i }).click()
  await page.waitForTimeout(2000)
  await captureAt(page, '04-camera-waiting')

  console.log('→ Voltar pra raiz e capturar fluxo de recusa inicial')
  await page.goto(`${BASE_URL}?local=demo`)
  await page.getByRole('button', { name: /^recusar$/i }).click()
  await page.getByRole('heading', { name: /obrigado pela visita/i }).waitFor()
  await captureAt(page, '05-thankyou-initial-refusal')

  console.log('→ mockDecision=aprovado pra capturar Result aprovado')
  await page.goto(`${BASE_URL}?local=demo&mockDecision=aprovado`)
  await page.getByRole('button', { name: /aceitar e continuar/i }).click()
  await page.getByRole('button', { name: /continuar/i }).click()
  await page.waitForTimeout(1500)
  await captureAt(page, '06-result-approved')

  console.log('→ mockDecision=requer_declaracao pra capturar DeclarationRequired')
  await page.goto(`${BASE_URL}?local=demo&mockDecision=requer_declaracao`)
  await page.getByRole('button', { name: /aceitar e continuar/i }).click()
  await page.getByRole('button', { name: /continuar/i }).click()
  await page.waitForTimeout(1500)
  await captureAt(page, '07-declaration-required')

  console.log('→ marcar checkbox e confirmar -> Result com declaração')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: /confirmar declaração/i }).click()
  await page.waitForTimeout(800)
  await captureAt(page, '08-result-with-declaration')

  console.log('→ mockDecision=recusado pra capturar Result recusado')
  await page.goto(`${BASE_URL}?local=demo&mockDecision=recusado`)
  await page.getByRole('button', { name: /aceitar e continuar/i }).click()
  await page.getByRole('button', { name: /continuar/i }).click()
  await page.waitForTimeout(1500)
  await captureAt(page, '09-result-denied')

  await browser.close()
  console.log('\nsmoke OK. screenshots em', SCREENSHOT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
