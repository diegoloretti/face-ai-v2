ALTER TABLE sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessoes_no_anon_access" ON sessoes
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "rate_limit_no_anon_access" ON rate_limit_buckets
  FOR ALL TO anon USING (false) WITH CHECK (false);
