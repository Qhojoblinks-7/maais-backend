require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  await client.connect();
  try {
    console.log('Checking Term table and leftover records...');
    
    const tablesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%erm%'`);
    console.log('Tables matching *erm*:', tablesRes.rows.map(r => r.table_name));
    
    const enumCheck = await client.query(`SELECT enumlabel FROM pg_enum WHERE enumtypid = 'TermNumber'::regtype ORDER BY enumsortorder`);
    console.log('Current TermNumber enum values:', enumCheck.rows.map(r => r.enumlabel).join(', '));
    
    const term3Enum = await client.query(`SELECT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TERM_3' AND enumtypid = 'TermNumber'::regtype)`);
    console.log('TERM_3 in enum?', term3Enum.rows[0].exists);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
