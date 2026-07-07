const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_uMJHWb90rSGv@ep-falling-math-ap8kiitm-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function main() {
  await client.connect();

  // List tables to find correct adminSettings table name
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('Tables:', tables.rows.map(r => r.table_name));

  const terms = await client.query('SELECT id, "termNumber", "isActive", "endDate" FROM "terms" WHERE "isActive" = true');
  console.log('Active terms:', JSON.stringify(terms.rows, null, 2));

  // Try common snake_case variations
  const possibleNames = ['"admin_settings"', '"adminsettings"', 'adminSettings'];
  for (const name of possibleNames) {
    try {
      const res = await client.query(`SELECT id, "systemFrozen", "systemFreezeReason", "lastManualUnfreeze", "updatedAt" FROM ${name} LIMIT 1`);
      console.log(`Admin settings from ${name}:`, JSON.stringify(res.rows, null, 2));
      break;
    } catch (e) {
      console.log(`Table ${name} not found: ${e.code}`);
    }
  }

  await client.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
