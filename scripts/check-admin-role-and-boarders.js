const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_uMJHWb90rSGv@ep-falling-math-ap8kiitm-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function main() {
  await client.connect();

  try {
    const adminUsers = await client.query(`
      SELECT u.id, u.email, u.role, u."staffProfileId"
      FROM users u
      WHERE u.role IN ('SUPER_ADMIN', 'HEADMASTER')
      LIMIT 5
    `);
    console.log('Admin users:', JSON.stringify(adminUsers.rows, null, 2));

    const boarders = await client.query('SELECT COUNT(*) FROM student_profiles WHERE "archivedAt" IS NULL AND "isBoarder" = true');
    const day = await client.query('SELECT COUNT(*) FROM student_profiles WHERE "archivedAt" IS NULL AND "isBoarder" = false');
    const total = await client.query('SELECT COUNT(*) FROM student_profiles WHERE "archivedAt" IS NULL');
    const nullBoarder = await client.query('SELECT COUNT(*) FROM student_profiles WHERE "archivedAt" IS NULL AND "isBoarder" IS NULL');

    console.log('boarders:', boarders.rows[0].count);
    console.log('day:', day.rows[0].count);
    console.log('total:', total.rows[0].count);
    console.log('null isBoarder:', nullBoarder.rows[0].count);

  } catch (e) {
    console.error(e);
  }

  await client.end();
}

main();
