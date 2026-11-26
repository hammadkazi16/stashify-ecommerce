import { spawn } from 'child_process';

function run(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['server/index.js'], {
      env: { ...process.env, PORT: '4999', ...env },
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve({ code: 'timeout', out }); }, 6000);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('exit', (code) => { clearTimeout(timer); resolve({ code, out }); });
  });
}

const cases = [
  { name: 'publishable key without secret', env: { CLERK_PUBLISHABLE_KEY: 'pk_test_example', CLERK_SECRET_KEY: '', MONGODB_URI: '' }, expect: 'Set both CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY' },
  { name: 'Clerk without MongoDB', env: { CLERK_PUBLISHABLE_KEY: 'pk_test_example', CLERK_SECRET_KEY: 'sk_test_example', MONGODB_URI: '' }, expect: 'Clerk sign-in requires MONGODB_URI' }
];

for (const c of cases) {
  const { code, out } = run.length ? await run(c.env) : await run(c.env);
  if (code === 0 || code === 'timeout' || !out.includes(c.expect)) {
    console.error(`FAIL: ${c.name} (exit ${code})\n${out}`);
    process.exit(1);
  }
  console.log(`  ✓ ${c.name} fails fast with a clear setup error`);
}
console.log('\n✅ AUTH ENV GUARDS PASSED');
