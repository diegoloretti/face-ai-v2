CREATE TABLE sessoes (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  local TEXT NOT NULL,
  faixa_etaria TEXT NOT NULL CHECK (faixa_etaria IN ('<13', '13-15', '16-21', '22+')),
  decisao TEXT NOT NULL CHECK (decisao IN (
    'aprovado', 'recusado', 'requer_declaracao', 'aprovado_com_declaracao'
  )),
  motivo TEXT,
  jwt_jti UUID NOT NULL UNIQUE,
  tamper_detected BOOLEAN NOT NULL DEFAULT false,
  client_features JSONB,
  server_features JSONB,
  declarou_maior_18 BOOLEAN DEFAULT NULL,
  timestamp_declaracao TIMESTAMPTZ DEFAULT NULL,
  ip_hash TEXT NOT NULL,
  user_agent_hash TEXT NOT NULL
);

CREATE TABLE rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_bucket_key TEXT,
  p_window_ms BIGINT
) RETURNS TABLE(current_count INT, window_remaining_ms BIGINT)
LANGUAGE plpgsql AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_window_interval INTERVAL := (p_window_ms || ' ms')::INTERVAL;
BEGIN
  RETURN QUERY
  INSERT INTO rate_limit_buckets (bucket_key, count, window_start)
  VALUES (p_bucket_key, 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE
    SET count = CASE
      WHEN rate_limit_buckets.window_start + v_window_interval < v_now
      THEN 1
      ELSE rate_limit_buckets.count + 1
    END,
    window_start = CASE
      WHEN rate_limit_buckets.window_start + v_window_interval < v_now
      THEN v_now
      ELSE rate_limit_buckets.window_start
    END
  RETURNING
    rate_limit_buckets.count AS current_count,
    (EXTRACT(EPOCH FROM (rate_limit_buckets.window_start + v_window_interval - v_now)) * 1000)::BIGINT AS window_remaining_ms;
END;
$$;
