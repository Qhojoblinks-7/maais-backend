require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  await client.connect();
  try {
    console.log('Handling leftover TERM_3 records...');
    
    const res = await client.query(`SELECT id FROM "Term" WHERE "termNumber" = 'TERM_3'`);
    if (res.rows.length > 0) {
      await client.query(`UPDATE "Term" SET "termNumber" = 'SEMESTER_2' WHERE "termNumber" = 'TERM_3'`);
      console.log(`Updated ${res.rows.length} TERM_3 record(s) to SEMESTER_2`);
    } else {
      console.log('No TERM_3 records found');
    }
    
    const enumCheck = await client.query(`SELECT enumlabel FROM pg_enum WHERE enumtypid = 'TermNumber'::regtype ORDER BY enumsortorder`);
    console.log('Current TermNumber enum values:', enumCheck.rows.map(r => r.enumlabel).join(', '));
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
