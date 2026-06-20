require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  await client.connect();
  try {
    const cols = await client.query(`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'terms' ORDER BY ordinal_position`);
    console.log('terms table columns:', cols.rows.map(r => `${r.column_name} (${r.data_type}/${r.udt_name})`).join(', '));
    
    const sample = await client.query(`SELECT * FROM "terms" LIMIT 3`);
    console.log('Sample data:', JSON.stringify(sample.rows, null, 2));
    
    const allTypes = await client.query(`SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') ORDER BY t.typname, e.enumsortorder`);
    console.log('All enum types:', allTypes.rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

main();
