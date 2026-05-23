import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const OUT = resolve(
  process.env.OUT_DIR ||
    'C:\\Users\\diego\\.claude\\playwright\\faceai-v2\\critique-2026-05-23',
)

await mkdir(OUT, { recursive: true })

const viewports = [
  { id: 'mobile', width: 393, height: 852 },
  { id: 'desktop', width: 1280, height: 900 },
]

const browser = await chromium.launch()

async function shot(page, vid, name) {
  const path = `${OUT}/${vid}-${name}.png`
  await page.screenshot({ path, fullPage: true })
  console.log('SAVED', path)
}

async function newPage(vp) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  return { ctx, page }
}

for (const vp of viewports) {
  // 1+2+3+4: flow up to camera-pending
  {
    const { ctx, page } = await newPage(vp)
    await page.goto(BASE)
    await page.waitForSelector('text=Verificação de idade')
    await shot(page, vp.id, '01-consent')

    await page.click('text=política de privacidade')
    await page.waitForSelector('text=Política de privacidade')
    await shot(page, vp.id, '02-privacy')
    await page.click('text=Voltar')

    await page.click('text=Aceitar e continuar')
    await page.waitForSelector('text=Antes de começar')
    await shot(page, vp.id, '03-instructions')

    await page.click('text=Continuar')
    await page.waitForTimeout(500)
    await shot(page, vp.id, '04-camera-pending')
    await ctx.close()
  }

  // 5: ThankYou initial refusal
  {
    const { ctx, page } = await newPage(vp)
    await page.goto(BASE)
    await page.waitForSelector('text=Verificação de idade')
    await page.click('text=Recusar')
    await page.waitForTimeout(500)
    await shot(page, vp.id, '05-thankyou-initial-refusal')
    await ctx.close()
  }

  // 6: Result approved
  {
    const { ctx, page } = await newPage(vp)
    await page.goto(`${BASE}?mockDecision=aprovado`)
    await page.click('text=Aceitar e continuar')
    await page.click('text=Continuar')
    await page.waitForSelector('text=Verificação aprovada')
    await shot(page, vp.id, '06-result-approved')
    await ctx.close()
  }

  // 7: Declaration required
  {
    const { ctx, page } = await newPage(vp)
    await page.goto(`${BASE}?mockDecision=requer_declaracao`)
    await page.click('text=Aceitar e continuar')
    await page.click('text=Continuar')
    await page.waitForSelector('text=Verificação adicional')
    await shot(page, vp.id, '07-declaration-required')
    // Try to check it
    try {
      await page.locator('text=Declaro, sob as penas da lei').first().click({ timeout: 5000 })
      await page.waitForTimeout(300)
      await shot(page, vp.id, '07b-declaration-checked')
    } catch (e) {
      console.log('skip 07b:', e.message)
    }
    await ctx.close()
  }

  // 10: Result recusado
  {
    const { ctx, page } = await newPage(vp)
    await page.goto(`${BASE}?mockDecision=recusado`)
    await page.click('text=Aceitar e continuar')
    await page.click('text=Continuar')
    await page.waitForSelector('text=Verificação não aprovada')
    await shot(page, vp.id, '10-result-denied')
    await ctx.close()
  }
}

await browser.close()
console.log('DONE', OUT)
