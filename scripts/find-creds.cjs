const BASE = 'http://localhost:3000/api/v1/auth/login';

async function tryLogin(email, pw) {
  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw }),
    });
    return res.status === 200 ? pw : null;
  } catch (e) {
    return null;
  }
}

(async () => {
  const hodCands = ['HOD@2024!', 'HOD@2024', 'HOD@2024!!', 'Password123', 'password', 'hod123', 'Mando@2024', 'admin123'];
  const tchCands = ['Teacher@2024', 'Teacher@2024!', 'Password123', 'password', 'teacher123', 'Mando@2024'];
  for (const pw of hodCands) {
    const m = await tryLogin('m.osei@mandoshts.edu.gh', pw);
    if (m) { console.log('HOD MATCH:', m); break; }
  }
  for (const pw of tchCands) {
    const m = await tryLogin('k.annan@mandoshts.edu.gh', pw);
    if (m) { console.log('TEACHER MATCH:', m); break; }
  }
  console.log('done');
})();
