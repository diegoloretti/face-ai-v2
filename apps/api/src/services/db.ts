import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import type { AgeTier } from '@face-ai/shared'
import type { ServerFeatures } from './decisionEngine.js'

export type SessionInsert = {
  id: string
  local: string
  faixa_etaria: AgeTier
  decisao: 'aprovado' | 'recusado' | 'requer_declaracao'
  motivo: string | null
  jwt_jti: string
  tamper_detected: boolean
  client_features: ServerFeatures
  server_features: ServerFeatures
  ip_hash: string
  user_agent_hash: string
}

export type DeclarationUpdate = {
  declarou_maior_18: true
  timestamp_declaracao: string
  decisao: 'aprovado_com_declaracao'
  jwt_jti: string
}

export type Db = {
  insertSessao: (row: SessionInsert) => Promise<void>
  updateDeclaration: (sessionId: string, update: DeclarationUpdate) => Promise<void>
  raw: SupabaseClient
}

export function buildSupabaseClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function createDb(client: SupabaseClient): Db {
  return {
    async insertSessao(row) {
      const { error } = await client.from('sessoes').insert(row)
      if (error) throw new Error(`insert_sessao_failed: ${error.message}`)
    },
    async updateDeclaration(sessionId, update) {
      const { error } = await client.from('sessoes').update(update).eq('id', sessionId)
      if (error) throw new Error(`update_declaration_failed: ${error.message}`)
    },
    raw: client,
  }
}
