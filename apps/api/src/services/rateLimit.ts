import type { SupabaseClient } from '@supabase/supabase-js'

export const WINDOW_MS = 60 * 60 * 1000
export const LIMITS = {
  verify: 60,
  'verify-declaration': 60,
  'verify-jwt': 120,
} as const

type Endpoint = keyof typeof LIMITS

type RateLimitRow = { current_count: number; window_remaining_ms: number }

export async function checkRateLimit(
  client: SupabaseClient,
  ipHash: string,
  endpoint: Endpoint,
): Promise<{ ok: boolean; retryAfter: number }> {
  const bucketKey = `${ipHash}:${endpoint}`
  const rpcCall = client
    .rpc('increment_rate_limit', { p_bucket_key: bucketKey, p_window_ms: WINDOW_MS })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await rpcCall) as any as { data: RateLimitRow[] | null; error: unknown }

  if (error || !data || data.length === 0) {
    return { ok: true, retryAfter: 0 }
  }

  const row = data[0]
  if (row.current_count > LIMITS[endpoint]) {
    return { ok: false, retryAfter: row.window_remaining_ms }
  }
  return { ok: true, retryAfter: 0 }
}
