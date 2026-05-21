-- Plano 5 - Telemetria de scores antispoof/liveness pra calibracao offline.
-- Sem PII, sem foto. Tabela separada de sessoes pra permitir insert fire-and-forget.

create table verification_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  age numeric not null,
  anti_spoof_score numeric not null,
  liveness_score numeric not null,
  face_detection_score numeric not null,
  composite_score numeric not null,
  blink_detected boolean not null default false,
  failed_liveness boolean not null,
  failed_antispoof boolean not null,
  failed_composite_shadow boolean not null,
  failed_blink boolean not null,
  decisao text not null,
  motivo text,
  faixa_etaria text not null,
  decision_mode text not null,
  created_at timestamptz not null default now()
);

create index verification_scores_created_at_idx on verification_scores (created_at desc);
create index verification_scores_session_id_idx on verification_scores (session_id);

alter table verification_scores enable row level security;
-- Sem policies. Anon e authenticated nao tem acesso. Service_role tem bypass nativo.

comment on table verification_scores is 'Telemetria de scores antispoof/liveness pra calibracao offline. Sem PII, sem foto. Plano 5.';
