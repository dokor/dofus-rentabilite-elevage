import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('local server serves the app and modules, refuses traversal and returns missing-file 404', async (t) => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/serve.mjs', import.meta.url))], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timed out')), 5000);
    child.once('error', reject);
    child.stderr.on('data', data => reject(new Error(String(data))));
    child.stdout.on('data', data => { const match = String(data).match(/Local: (http:\/\/127\.0\.0\.1:\d+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /Chaque Volkorne compte/);
  for (const file of ['app.js', 'calculator.js', 'xp-data.js', 'styles.css', 'icon.svg']) assert.equal((await fetch(`${origin}/${file}`)).status, 200, file);
  assert.equal((await fetch(`${origin}/missing-file.js`)).status, 404);
  assert.equal((await fetch(`${origin}/%2e%2e%2fpackage.json`)).status, 403);
});
