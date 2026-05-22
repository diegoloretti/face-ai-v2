import { test, expect, type Page } from '@playwright/test'

async function captureAt(page: Page, name: string) {
  await page.waitForTimeout(400)
  if (process.env.SAVE_SCREENSHOTS === 'true') {
    await page.screenshot({ path: `playwright-report/screenshots/${name}.png`, fullPage: true })
  }
}

test.describe('smoke fluxo principal', () => {
  test('Consent -> PrivacyPolicy -> volta -> Instructions -> Camera', async ({ page }) => {
    await page.goto(`/?local=smoke`)
    await expect(page.getByRole('heading', { name: /verificação de idade/i })).toBeVisible({
      timeout: 10000,
    })
    await captureAt(page, '01-consent')

    await page.getByRole('button', { name: /política de privacidade/i }).click()
    await expect(page.getByRole('heading', { name: /política de privacidade/i })).toBeVisible()
    await captureAt(page, '02-privacy')

    await page.getByRole('button', { name: /voltar/i }).click()
    await page.getByRole('button', { name: /aceitar e continuar/i }).click()
    await expect(page.getByRole('heading', { name: /antes de começar/i })).toBeVisible()
    await captureAt(page, '03-instructions')

    await page.getByRole('button', { name: /continuar/i }).click()
    await page.waitForTimeout(2000)
    await captureAt(page, '04-camera-waiting')
  })

  test('recusa inicial leva pro ThankYou', async ({ page }) => {
    await page.goto(`/?local=smoke`)
    await page.getByRole('button', { name: /^recusar$/i }).click()
    await expect(page.getByRole('heading', { name: /obrigado pela visita/i })).toBeVisible()
    await captureAt(page, '05-thankyou-initial-refusal')
  })
})

test.describe('smoke mock decisions (só roda em dev local com VITE_USE_MOCK_API=true)', () => {
  // apps/web/.env tem VITE_USE_MOCK_API=false por default. Pra rodar esses
  // tests, dev server precisa ter sido iniciado com `pnpm --filter @face-ai/web dev:mock`.
  // Em CI, preview Vercel ou prod, skipped.
  test.skip(
    process.env.RUN_MOCK_TESTS !== 'true' || process.env.BASE_URL?.includes('vercel.app') === true,
    'mock decisions exigem RUN_MOCK_TESTS=true + dev server iniciado com VITE_USE_MOCK_API=true',
  )

  test('mockDecision=aprovado renderiza Result aprovado', async ({ page }) => {
    await page.goto(`/?local=smoke&mockDecision=aprovado`)
    await page.getByRole('button', { name: /aceitar e continuar/i }).click()
    await page.getByRole('button', { name: /continuar/i }).click()
    await page.waitForTimeout(1500)
    await captureAt(page, '06-result-approved')
    await expect(page.getByText(/aprovado/i)).toBeVisible()
  })

  test('mockDecision=requer_declaracao mostra DeclarationRequired', async ({ page }) => {
    await page.goto(`/?local=smoke&mockDecision=requer_declaracao`)
    await page.getByRole('button', { name: /aceitar e continuar/i }).click()
    await page.getByRole('button', { name: /continuar/i }).click()
    await page.waitForTimeout(1500)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /confirmar declaração/i }).click()
    await page.waitForTimeout(800)
    await captureAt(page, '07-declaration-confirmed')
    await expect(page.getByText(/aprovado/i)).toBeVisible()
  })

  test('mockDecision=recusado renderiza Result recusado', async ({ page }) => {
    await page.goto(`/?local=smoke&mockDecision=recusado`)
    await page.getByRole('button', { name: /aceitar e continuar/i }).click()
    await page.getByRole('button', { name: /continuar/i }).click()
    await page.waitForTimeout(1500)
    await captureAt(page, '08-result-denied')
    await expect(page.getByText(/recusado/i)).toBeVisible()
  })
})
