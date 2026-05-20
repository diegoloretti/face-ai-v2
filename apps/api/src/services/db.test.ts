import { describe, it, expect, vi } from 'vitest'
import { createDb, type SessionInsert, type DeclarationUpdate } from './db.js'

function fakeSupabase() {
  const insertSpy = vi.fn().mockResolvedValue({ error: null })
  const updateBuilder = {
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
  const updateSpy = vi.fn().mockReturnValue(updateBuilder)
  const rpcSpy = vi
    .fn()
    .mockResolvedValue({ data: [{ current_count: 1, window_remaining_ms: 3600000 }], error: null })

  const client = {
    from: vi.fn().mockImplementation(() => ({
      insert: insertSpy,
      update: updateSpy,
    })),
    rpc: rpcSpy,
  }
  return { client, insertSpy, updateSpy, updateBuilder, rpcSpy }
}

describe('createDb.insertSessao', () => {
  it('insere row em sessoes com payload completo', async () => {
    const { client, insertSpy } = fakeSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createDb(client as any)
    const row: SessionInsert = {
      id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      local: 'demo',
      faixa_etaria: '22+',
      decisao: 'aprovado',
      motivo: null,
      jwt_jti: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
      tamper_detected: false,
      client_features: { age: 30, antiSpoofScore: 0.9, livenessScore: 0.9, faceDetectionScore: 0.95 },
      server_features: { age: 30, antiSpoofScore: 0.9, livenessScore: 0.9, faceDetectionScore: 0.95 },
      ip_hash: 'aa'.repeat(32),
      user_agent_hash: 'bb'.repeat(32),
    }
    await db.insertSessao(row)
    expect(insertSpy).toHaveBeenCalledWith(row)
  })

  it('lança Error quando supabase retorna erro', async () => {
    const { client, insertSpy } = fakeSupabase()
    insertSpy.mockResolvedValueOnce({ error: { message: 'boom' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createDb(client as any)
    await expect(
      db.insertSessao({
        id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
        local: 'x',
        faixa_etaria: '22+',
        decisao: 'aprovado',
        motivo: null,
        jwt_jti: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
        tamper_detected: false,
        client_features: {} as never,
        server_features: {} as never,
        ip_hash: '00',
        user_agent_hash: '00',
      }),
    ).rejects.toThrow(/insert_sessao_failed/)
  })
})

describe('createDb.updateDeclaration', () => {
  it('chama update().eq() com sessionId', async () => {
    const { client, updateSpy, updateBuilder } = fakeSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createDb(client as any)
    const update: DeclarationUpdate = {
      declarou_maior_18: true,
      timestamp_declaracao: '2026-05-20T10:00:00.000Z',
      decisao: 'aprovado_com_declaracao',
      jwt_jti: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
    }
    await db.updateDeclaration('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', update)
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining(update))
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
  })
})
