CREATE INDEX idx_sessoes_local ON sessoes(local);
CREATE INDEX idx_sessoes_created_at ON sessoes(created_at DESC);
CREATE INDEX idx_sessoes_tamper ON sessoes(tamper_detected) WHERE tamper_detected = true;
CREATE INDEX idx_sessoes_decisao ON sessoes(decisao);
