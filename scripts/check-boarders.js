const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_uMJHWb90rSGv@ep-falling-math-ap8kiitm-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function main() {
  await client.connect();

  try {
    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE '%staff%'");
    console.log('User staff cols:', cols.rows);

    const t = await client.query('SELECT COUNT(*) as count FROM student_profiles WHERE "archivedAt" IS NULL AND "isBoarder" = true');
    console.log('boarders:', t.rows[0].count);

    const d = await client.query('SELECT COUNT(*) as count FROM student_profiles WHERE "archivedAt" IS NULL AND "isBoarder" = false');
    console.log('day:', d.rows[0].count);

    const n = await client.query('SELECT COUNT(*) as count FROM student_profiles WHERE "archivedAt" IS NULL AND "isBoarder" IS NULL');
    console.log('null:', n.rows[0].count);

    const adminUsers = await client.query("SELECT id, email, role FROM users WHERE role IN ('SUPER_ADMIN', 'HEADMASTER') LIMIT 5");
    console.log('Admin users:', adminUsers.rows);
  } catch (e) {
    console.error(e);
  }

  await client.end();
}

main();
