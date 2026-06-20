require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  await client.connect();
  try {
    console.log('Mapping TERM_3 records to SEMESTER_2...');
    
    const res = await client.query(`SELECT id, "termNumber" FROM "terms" WHERE "termNumber" = 'TERM_3'`);
    if (res.rows.length > 0) {
      await client.query(`UPDATE "terms" SET "termNumber" = 'SEMESTER_2' WHERE "termNumber" = 'TERM_3'`);
      console.log(`Updated ${res.rows.length} record(s) from TERM_3 -> SEMESTER_2`);
    } else {
      console.log('No TERM_3 records found');
    }
    
    const all = await client.query(`SELECT id, "termNumber", "isActive" FROM "terms"`);
    console.log('Current terms:', all.rows);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
