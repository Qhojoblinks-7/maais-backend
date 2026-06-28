import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTrigger() {
  const checkSql = `
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'audit_logs_insert_only'
    ) AS exists
  `;

  const result = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'audit_logs_insert_only'
    ) AS exists
  `;

  const exists = (result as any[])[0]?.exists;
  if (exists) {
    console.log('Trigger already exists');
    await prisma.$disconnect();
    return;
  }

  const createFunctionSql = `
    CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'audit_logs table is immutable. INSERT only.';
    END;
    $$ LANGUAGE plpgsql;
  `;

  const createTriggerSql = `
    CREATE TRIGGER audit_logs_insert_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();
  `;

  await prisma.$executeRaw(createFunctionSql);
  await prisma.$executeRaw(createTriggerSql);

  console.log('audit_logs insert-only trigger created successfully');
  await prisma.$disconnect();
}

createTrigger().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
