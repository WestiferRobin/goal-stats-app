import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../develop.sh', import.meta.url));
function fixture(t, configured = true) {
  const root = mkdtempSync(join(tmpdir(), 'goalstats-lifecycle-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts/development'), { recursive: true });
  mkdirSync(join(root, 'bin'));
  mkdirSync(join(root, 'node_modules/next/dist/bin'), { recursive: true });
  copyFileSync(script, join(root, 'scripts/develop.sh'));
  const config = 'APP_PORT=3001\nFOOTBALL_API_BASE_URL=http://127.0.0.1:5100\n';
  writeFileSync(join(root, '.env.example'), config);
  if (configured) writeFileSync(join(root, '.env.local'), config);
  writeFileSync(join(root, 'node_modules/next/dist/bin/next'), '');
  const log = join(root, 'calls.jsonl');
  for (const name of ['node', 'npm', 'docker']) {
    writeFileSync(join(root, 'bin', name), `#!${process.execPath}
const fs=require('node:fs'); const args=process.argv.slice(2);
fs.appendFileSync(process.env.CALL_LOG,JSON.stringify([${JSON.stringify(name)},...args])+'\\n');
if(${JSON.stringify(name)}==='node') {
 if(process.env.REJECT_NODE==='1')process.exit(9);
 if(args.at(-1)==='config')console.log('3001');
}
if(${JSON.stringify(name)}==='docker') {
 if(args.includes('up') && process.env.FAIL_UP==='1')process.exit(1);
 if(args.includes('port'))console.log('127.0.0.1:3001');
}
`, { mode: 0o755 });
  }
  const env = { ...process.env, PATH: `${root}/bin:/usr/bin:/bin`, CALL_LOG: log };
  for (const key of Object.keys(env)) if (/^(COMPOSE_|APP_PORT$|PORT$|FOOTBALL_API_BASE_URL$|SERVICE_API_TOKEN$)/.test(key)) delete env[key];
  return {
    root,
    run(action, overrides = {}) { return spawnSync('/bin/bash', ['scripts/develop.sh', action], { cwd: root, env: { ...env, ...overrides }, encoding: 'utf8' }); },
    calls() { try { return readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); } catch { return []; } },
  };
}

test('setup creates configuration and installs/builds without starting services', t => {
  const f = fixture(t, false); assert.equal(f.run('setup').status, 0);
  assert.equal(readFileSync(join(f.root, '.env.local'), 'utf8'), readFileSync(join(f.root, '.env.example'), 'utf8'));
  const calls = f.calls(); assert.ok(calls.some(c => c[0] === 'npm' && c[1] === 'ci'));
  assert.equal(calls.filter(c => c[0] === 'docker' && c.includes('build')).length, 2);
  assert.ok(calls.every(c => !c.includes('up') && !c.includes('down')));
});
test('setup preserves an existing environment byte for byte', t => {
  const f = fixture(t); const file = join(f.root, '.env.local');
  const before = readFileSync(file); assert.equal(f.run('setup').status, 0); assert.deepEqual(readFileSync(file), before);
});
test('native run launches only its helper and makes no Docker calls', t => {
  const f = fixture(t); assert.equal(f.run('run').status, 0);
  assert.ok(f.calls().some(c => c[0] === 'node' && c.at(-1) === 'run'));
  assert.ok(f.calls().every(c => c[0] !== 'docker'));
});
test('unsupported host Node fails before native startup', t => {
  const f = fixture(t); assert.equal(f.run('run', { REJECT_NODE: '1' }).status, 2);
  assert.ok(f.calls().every(c => !c.includes('run')));
});
test('Docker deploy needs no host Node/npm and separates build from up', t => {
  const f = fixture(t); const result = f.run('deploy', { REJECT_NODE: '1' }); assert.equal(result.status, 0);
  const calls = f.calls(); assert.ok(calls.every(c => c[0] === 'docker'));
  const build = calls.findIndex(c => c.includes('build')); const up = calls.findIndex(c => c.includes('up'));
  assert.ok(build >= 0 && up > build); assert.ok(!calls[up].includes('--build'));
  assert.ok(calls[up].includes('--wait')); assert.match(result.stdout, /127\.0\.0\.1:3001\/teams/);
});
test('Docker bind/readiness failure is reported without retries or teardown', t => {
  const f = fixture(t); const result = f.run('deploy', { FAIL_UP: '1' }); assert.equal(result.status, 1);
  assert.match(result.stderr, /APP_PORT/); assert.equal(f.calls().filter(c => c.includes('up')).length, 1);
  assert.ok(f.calls().every(c => !c.includes('down') && !c.includes('stop')));
});
test('stop affects only the frontend Compose project and preserves volumes', t => {
  const f = fixture(t); assert.equal(f.run('stop', { REJECT_NODE: '1' }).status, 0);
  const down = f.calls().find(c => c.includes('down')); assert.ok(down);
  assert.ok(down.includes('goal-stats-app-local')); assert.ok(down.includes('docker/compose.local.yml'));
  assert.ok(!down.includes('--volumes') && !down.includes('-v'));
  assert.ok(f.calls().every(c => c[0] === 'docker' && !c.join(' ').includes('goalstats-service')));
});
test('inherited Compose overrides fail closed with values redacted', t => {
  const f = fixture(t); const result = f.run('deploy', { COMPOSE_FILE: 'private-path' });
  assert.equal(result.status, 2); assert.match(result.stderr, /COMPOSE_FILE/); assert.ok(!result.stderr.includes('private-path'));
  assert.ok(f.calls().every(c => !c.includes('up') && !c.includes('build')));
});
test('help needs no tools and advertises native versus Docker semantics', t => {
  const f = fixture(t); const result = f.run('help'); assert.equal(result.status, 0);
  assert.match(result.stdout, /make deploy/); assert.match(result.stdout, /native Next.js/); assert.deepEqual(f.calls(), []);
});
test('native helper forwards termination to its own Next.js child', { timeout: 10000 }, async t => {
  const f = fixture(t);
  copyFileSync(fileURLToPath(new URL('./local.mjs', import.meta.url)), join(f.root, 'scripts/development/local.mjs'));
  writeFileSync(join(f.root, 'node_modules/next/dist/bin/next'), `process.on('SIGTERM',()=>process.exit(0)); console.log('child-ready'); setInterval(()=>{},1000);`);
  const env = { ...process.env };
  for (const key of ['APP_PORT', 'PORT', 'FOOTBALL_API_BASE_URL', 'SERVICE_API_TOKEN']) delete env[key];
  // Ask the OS for a free fixture port; the fake Next.js child does not listen.
  const { createServer } = await import('node:net'); const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  writeFileSync(join(f.root, '.env.local'), `APP_PORT=${port}\nFOOTBALL_API_BASE_URL=http://127.0.0.1:5100\n`);
  const child = spawn(process.execPath, ['scripts/development/local.mjs', 'run'], { cwd: f.root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  const exit = once(child, 'exit');
  await new Promise((resolve, reject) => {
    child.stdout.once('data', data => data.toString().includes('child-ready') ? resolve() : reject(new Error('Unexpected child output')));
    child.once('error', reject); child.once('exit', () => reject(new Error('Child exited before readiness')));
  });
  child.kill('SIGTERM'); const [code] = await exit; assert.equal(code, 0);
});
