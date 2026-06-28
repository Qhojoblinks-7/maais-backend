-- Create insert-only trigger on audit_logs to enforce immutability at DB level
-- This prevents UPDATE and DELETE operations on audit_logs for all users including admins

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_logs_insert_only'
  ) THEN
    CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'audit_logs table is immutable. INSERT only.';
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER audit_logs_insert_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();
  END IF;
END;
$$;
