export function sanitizeLocal(raw: string | null): string {
  if (!raw) return 'desconhecido'
  const cleaned = raw.slice(0, 50).replace(/[^a-zA-Z0-9_-]/g, '')
  return cleaned || 'desconhecido'
}
