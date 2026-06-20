require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  await client.connect();
  try {
    console.log('Fixing TermNumber enum in database...');
    
    await client.query(`ALTER TYPE "TermNumber" RENAME VALUE 'TERM_1' TO 'SEMESTER_1'`);
    console.log('Renamed TERM_1 -> SEMESTER_1');
    
    await client.query(`ALTER TYPE "TermNumber" RENAME VALUE 'TERM_2' TO 'SEMESTER_2'`);
    console.log('Renamed TERM_2 -> SEMESTER_2');
    
    const res3 = await client.query(`SELECT id, "termNumber" FROM "Term" WHERE "termNumber" = 'TERM_3'`);
    if (res3.rows.length > 0) {
      console.log(`Found ${res3.rows.length} records with TERM_3, updating to SEMESTER_2...`);
      await client.query(`UPDATE "Term" SET "termNumber" = 'SEMESTER_2' WHERE "termNumber" = 'TERM_3'`);
      console.log('Updated TERM_3 records to SEMESTER_2');
    }
    
    const enumCheck = await client.query(`SELECT enumlabel FROM pg_enum WHERE enumtypid = 'TermNumber'::regtype ORDER BY enumsortorder`);
    console.log('Current TermNumber enum values:', enumCheck.rows.map(r => r.enumlabel).join(', '));
    
    console.log('Enum values fixed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
