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

const hods = [
  'm.osei@mandoshts.edu.gh',
  's.mensah@mandoshts.edu.gh',
  'd.boateng@mandoshts.edu.gh',
  'g.amoah@mandoshts.edu.gh',
  't.brew@mandoshts.edu.gh',
];

(async () => {
  for (const email of hods) {
    const m = await tryLogin(email, 'HOD@2024!');
    if (m) console.log('HOD OK:', email, '->', m);
    else console.log('HOD NO:', email);
  }
})();
