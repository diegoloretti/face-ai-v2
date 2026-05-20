export type AgeTier = '<13' | '13-15' | '16-21' | '22+'

export function classifyAge(age: number): AgeTier {
  if (age < 13) return '<13'
  if (age < 16) return '13-15'
  if (age < 22) return '16-21'
  return '22+'
}
