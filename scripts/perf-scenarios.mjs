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

async function runFlowOnce(page, baseUrl) {
  const READ_DELAY_MS = 6000
  const mountTimestamp = Date.now()
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /aceitar e continuar/i }).waitFor()
  await page.waitForTimeout(READ_DELAY_MS)
  await page.getByRole('button', { name: /aceitar e continuar/i }).click()
  await page.getByRole('button', { name: /continuar/i }).waitFor()
  await page.waitForTimeout(READ_DELAY_MS)
  const tContinue = Date.now()
  await page.getByRole('button', { name: /continuar/i }).click()
  await page.locator('.screen-camera').waitFor({ timeout: 15000 })

  const modelsCompletedAt = await page.evaluate(async () => {
    const deadline = Date.now() + 60000
    while (Date.now() < deadline) {
      const models = performance.getEntriesByType('resource')
        .filter((e) => /\/models\//.test(e.name) && e.responseEnd > 0)
      if (models.length >= 9) {
        return { count: models.length, lastEnd: Math.max(...models.map((e) => e.responseEnd)) }
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    return { count: 0, lastEnd: -1 }
  })

  const totalKb = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource')
    const all = entries.reduce((s, e) => s + (e.transferSize || e.encodedBodySize || 0), 0)
    const models = entries
      .filter((e) => /\/models\//.test(e.name))
      .reduce((s, e) => s + (e.transferSize || e.encodedBodySize || 0), 0)
    return { all_kb: Math.round(all / 1024), model_kb: Math.round(models / 1024) }
  })

  return {
    mount_to_models_ready_ms: Math.round(modelsCompletedAt.lastEnd),
    camera_to_models_ready_ms: Math.max(0, Math.round(modelsCompletedAt.lastEnd) - (tContinue - mountTimestamp)),
    model_files: modelsCompletedAt.count,
    model_kb: totalKb.model_kb,
    total_kb: totalKb.all_kb,
  }
}

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
    // Usa domcontentloaded em vez de networkidle - o prefetch dispara downloads
    // dos modelos no mount, então networkidle nunca acontece.
    name: 'mobile-slow4g-cpu4x',
    setup: async (page, ctx) => {
      await applyMobileThrottle(page)
      await page.goto(ctx.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      // Aguarda o suficiente pra LCP estabilizar mas não tudo terminar de baixar
      await page.waitForTimeout(4000)
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
    // PDV em mobile + 4G slow, primeira visita (cache vazio).
    // Simula 6s de leitura em cada tela - sem isso o teste clica em <200ms e
    // o prefetch não tem tempo de baixar nada.
    name: 'flow-pdv-mobile-cold',
    threshold_ms: 60000,
    setup: async (page) => {
      await page.context().grantPermissions(['camera'])
      await applyMobileThrottle(page)
    },
    measure: async (page, ctx) => {
      return runFlowOnce(page, ctx.baseUrl)
    },
  },
  {
    // PDV em mobile, cliente N+1 da fila (mesmo browser context = cache quente).
    // Mede o ganho do Cache-Control immutable: modelos vêm do cache, não rede.
    name: 'flow-pdv-mobile-warm',
    threshold_ms: 120000,
    setup: async (page, ctx) => {
      await page.context().grantPermissions(['camera'])
      await applyMobileThrottle(page)
      // 1ª visita - aquece o cache do browser
      await runFlowOnce(page, ctx.baseUrl)
    },
    measure: async (page, ctx) => {
      // 2ª visita no mesmo context. Reabre a página pra forçar React re-mount
      // (zera o singleton em memória do useHuman.ts), o que dispara load()
      // de novo. Se o cache-control immutable funciona, modelos vêm do cache.
      const first = await runFlowOnce(page, ctx.baseUrl)
      // Coleta diagnostic: bytes transferidos nessa 2ª passada
      const cacheInfo = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource')
        const models = entries.filter((e) => /\/models\//.test(e.name))
        const cacheHits = models.filter((e) => (e.transferSize || 0) === 0).length
        return {
          model_entries: models.length,
          cache_hits: cacheHits,
          avg_duration_ms: models.length
            ? Math.round(models.reduce((s, e) => s + e.duration, 0) / models.length)
            : 0,
        }
      })
      return { ...first, ...cacheInfo }
    },
  },
]
