export function sanitizeLocal(raw: string | null): string {
  if (!raw) return 'desconhecido'
  return raw.slice(0, 50).replace(/[^a-zA-Z0-9_-]/g, '')
}
