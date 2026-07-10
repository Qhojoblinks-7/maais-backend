const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const p = new PrismaClient();

(async () => {
  const u = await p.user.findFirst({
    where: { email: 'm.osei@mandoshts.edu.gh' },
    select: { id: true, email: true, passwordHash: true, role: true },
  });
  if (!u) {
    console.log('NO USER m.osei');
    await p.$disconnect();
    return;
  }
  console.log('role', u.role, 'hasHash', !!u.passwordHash);
  const candidates = [
    'HOD@2024!', 'HOD@2024', 'Password123', 'password',
    'Teacher@2024', 'Teacher@2024!', 'HOD@2024!!',
  ];
  for (const pw of candidates) {
    try {
      const ok = await argon2.verify(u.passwordHash, pw);
      if (ok) { console.log('MATCH:', pw); break; }
    } catch (e) { /* ignore */ }
  }
  // also check teacher
  const t = await p.user.findFirst({
    where: { email: 'k.annan@mandoshts.edu.gh' },
    select: { id: true, role: true, passwordHash: true },
  });
  if (t) {
    for (const pw of ['Teacher@2024', 'Teacher@2024!', 'Password123', 'password', 'teacher123']) {
      try {
        const ok = await argon2.verify(t.passwordHash, pw);
        if (ok) { console.log('TEACHER MATCH:', pw); break; }
      } catch (e) { /* ignore */ }
    }
  } else {
    console.log('NO USER k.annan');
  }
  await p.$disconnect();
})().catch((e) => { console.log('ERR', e.message); process.exit(0); });
