const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_uMJHWb90rSGv@ep-falling-math-ap8kiitm-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function main() {
  await client.connect();

  const tables = [
    'student_profiles',
    'staff_profiles',
    'grade_entries',
    'notifications',
    'support_tickets',
    'approval_requests',
  ];

  for (const table of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`${table}: ${res.rows[0].count}`);
    } catch (e) {
      console.log(`${table}: error - ${e.message}`);
    }
  }

  // Check admin_settings
  try {
    const settings = await client.query('SELECT * FROM admin_settings LIMIT 1');
    console.log('admin_settings:', JSON.stringify(settings.rows[0], null, 2));
  } catch (e) {
    console.log('admin_settings: error -', e.message);
  }

  // Check active term
  try {
    const terms = await client.query('SELECT id, "termNumber", "isActive", "endDate" FROM terms WHERE "isActive" = true');
    console.log('active terms:', JSON.stringify(terms.rows, null, 2));
  } catch (e) {
    console.log('terms: error -', e.message);
  }

  await client.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
