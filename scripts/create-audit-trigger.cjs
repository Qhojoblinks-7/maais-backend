require('dotenv').config();
const { Client } = require('pg');

async function createTrigger() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const checkSql = `
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'audit_logs_insert_only'
    ) AS exists
  `;

  const result = await client.query(checkSql);
  if (result.rows[0]?.exists) {
    console.log('Trigger already exists');
    await client.end();
    return;
  }

  await client.query(`
    CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'audit_logs table is immutable. INSERT only.';
    END;
    $$ LANGUAGE plpgsql;
  `);

  await client.query(`
    CREATE TRIGGER audit_logs_insert_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();
  `);

  console.log('audit_logs insert-only trigger created successfully');
  await client.end();
}

createTrigger().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
