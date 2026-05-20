export async function hashIp(ip: string): Promise<string> {
  const now = new Date()
  const monthlySalt = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const input = new TextEncoder().encode(`${ip}:${monthlySalt}`)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
