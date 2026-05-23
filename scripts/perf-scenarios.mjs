const VITALS_SCRIPT = `
new Promise((resolve) => {
  const data = { fcp: null, lcp: null, cls: 0, tbt_ms: 0, ttfb: null };
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav) data.ttfb = Math.round(nav.responseStart);
  for (const e of performance.getEntriesByType('paint')) {
    if (e.name === 'first-contentful-paint') data.fcp = Math.round(e.startTime);
  }
  try {
    new PerformanceObserver((list) => {
      const last = list.getEntries().pop();
      if (last) data.lcp = Math.round(last.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) data.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (e.duration > 50) data.tbt_ms += Math.round(e.duration - 50);
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
  setTimeout(() => {
    data.cls = Math.round(data.cls * 1000) / 1000;
    resolve(data);
  }, 3000);
});
`

const RESOURCE_BYTES_SCRIPT = `
(() => {
  const entries = performance.getEntriesByType('resource');
  const out = { models: { count: 0, bytes: 0 }, js: { count: 0, bytes: 0 }, all: { count: entries.length, bytes: 0 } };
  for (const e of entries) {
    const size = e.transferSize || e.encodedBodySize || 0;
    out.all.bytes += size;
    if (/\\/models\\//.test(e.name)) { out.models.count++; out.models.bytes += size; }
    if (e.initiatorType === 'script' || /\\.js(\\?|$)/.test(e.name)) { out.js.count++; out.js.bytes += size; }
  }
  return out;
})()
`

async function applyMobileThrottle(page) {
  const session = await page.context().newCDPSession(page)
  // Slow 4G profile (Chrome DevTools default)
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  })
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
}

export const scenarios = [
  {
    // Mede Web Vitals com throttle mobile real (Slow 4G + CPU 4x).
    // total_ms inclui setup + 3s de coleta de Web Vitals - não é o sinal, sinal é o metric.
    name: 'mobile-slow4g-cpu4x',
    setup: async (page, ctx) => {
      await applyMobileThrottle(page)
      await page.goto(ctx.baseUrl, { waitUntil: 'networkidle', timeout: 30000 })
    },
    measure: async (page) => {
      const vitals = await page.evaluate(VITALS_SCRIPT)
      const bytes = await page.evaluate(RESOURCE_BYTES_SCRIPT)
      return {
        fcp_ms: vitals.fcp,
        lcp_ms: vitals.lcp,
        cls: vitals.cls,
        tbt_ms: vitals.tbt_ms,
        initial_js_kb: Math.round(bytes.js.bytes / 1024),
        initial_total_kb: Math.round(bytes.all.bytes / 1024),
      }
    },
  },
  {
    // Mede o pipeline real do PDV: consent → instructions → camera + load dos 5 modelos do @vladmandic/human.
    // Throttle mobile aplicado pra refletir 4G de cliente em loja.
    name: 'flow-pdv-mobile-models',
    threshold_ms: 30000,
    setup: async (page, ctx) => {
      await page.context().grantPermissions(['camera'])
      await applyMobileThrottle(page)
      await page.goto(ctx.baseUrl, { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: /aceitar e continuar/i }).waitFor()
    },
    measure: async (page) => {
      const t0 = Date.now()
      await page.getByRole('button', { name: /aceitar e continuar/i }).click()
      await page.getByRole('button', { name: /continuar/i }).waitFor()
      const consentToInstructions = Date.now() - t0

      const t1 = Date.now()
      await page.getByRole('button', { name: /continuar/i }).click()
      await page.locator('.screen-camera').waitFor({ timeout: 15000 })
      const instructionsToCameraRender = Date.now() - t1

      // Espera os modelos do @vladmandic/human terminarem de baixar
      const t2 = Date.now()
      await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {})
      const cameraToModelsReady = Date.now() - t2

      const bytes = await page.evaluate(RESOURCE_BYTES_SCRIPT)

      return {
        consent_to_instructions_ms: consentToInstructions,
        instructions_to_camera_ms: instructionsToCameraRender,
        camera_to_models_ready_ms: cameraToModelsReady,
        total_to_camera_ready_ms: consentToInstructions + instructionsToCameraRender + cameraToModelsReady,
        model_files: bytes.models.count,
        model_kb: Math.round(bytes.models.bytes / 1024),
        total_kb: Math.round(bytes.all.bytes / 1024),
      }
    },
  },
]
