require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  await client.connect();
  try {
    const term3 = await client.query(`SELECT id FROM "terms" WHERE "termNumber" = 'TERM_3'`);
    if (term3.rows.length === 0) {
      console.log('No TERM_3 records found');
      return;
    }
    
    const term3Id = term3.rows[0].id;
    console.log('TERM_3 id:', term3Id);
    
    const tablesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
    const allTables = tablesRes.rows.map(r => r.table_name);
    
    let hasReferences = false;
    for (const table of allTables) {
      try {
        const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name LIKE '%ermId%'`, [table]);
        for (const col of cols.rows) {
          const refs = await client.query(`SELECT COUNT(*) as count FROM "${table}" WHERE "${col.column_name}" = $1`, [term3Id]);
          if (parseInt(refs.rows[0].count) > 0) {
            console.log(`  References found: ${table}.${col.column_name} (${refs.rows[0].count} rows)`);
            hasReferences = true;
          }
        }
      } catch (e) {}
    }
    
    if (!hasReferences) {
      console.log('No references found. Deleting TERM_3 record...');
      await client.query(`DELETE FROM "terms" WHERE id = $1`, [term3Id]);
      console.log('TERM_3 record deleted');
    } else {
      console.log('Cannot delete - has references. Alternative: update dates to match SEMESTER_2 range');
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
