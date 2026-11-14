import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { configuration, checkPort } from './local.mjs';

function fixture(t, extra = '') {
  const root = mkdtempSync(join(tmpdir(), 'goalstats-config-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, '.env.local'), `APP_PORT=3001\nFOOTBALL_API_BASE_URL=http://127.0.0.1:5100\n${extra}`);
  return root;
}
test('native configuration preserves the file and selects explicit port and host origin', t => {
  const root = fixture(t); const before = readFileSync(join(root, '.env.local'));
  const env = configuration(root, {});
  assert.equal(env.APP_PORT, '3001');
  assert.equal(env.FOOTBALL_API_BASE_URL, 'http://127.0.0.1:5100');
  assert.equal(env.GOALSTATS_LOCAL_DOCKER, '');
  assert.deepEqual(readFileSync(join(root, '.env.local')), before);
});
test('conflicting inherited configuration fails without printing its value', t => {
  const root = fixture(t);
  for (const key of ['APP_PORT', 'FOOTBALL_API_BASE_URL', 'SERVICE_API_TOKEN']) {
    assert.throws(() => configuration(root, { [key]: 'private-test-value' }), error => error.message.includes(key) && !error.message.includes('private-test-value'));
  }
  assert.throws(() => configuration(root, { PORT: '3000' }), /Conflicting inherited PORT/);
});
test('invalid ports and Docker-only or prefixed native origins fail', t => {
  const root = fixture(t);
  for (const port of ['0', '65536', 'abc']) {
    writeFileSync(join(root, '.env.local'), `APP_PORT=${port}\nFOOTBALL_API_BASE_URL=http://127.0.0.1:5100\n`);
    assert.throws(() => configuration(root, {}), /APP_PORT/);
  }
  for (const url of ['http://host.docker.internal:5100', 'http://127.0.0.1:8000', 'http://127.0.0.1:5100/api/v1', 'http://user:secret@localhost:5100']) {
    writeFileSync(join(root, '.env.local'), `APP_PORT=3001\nFOOTBALL_API_BASE_URL=${url}\n`);
    assert.throws(() => configuration(root, {}), /host-accessible origin/);
  }
});
test('symlink environment files are refused without changing their target', t => {
  const root = fixture(t); const path = join(root, '.env.local');
  rmSync(path); writeFileSync(join(root, 'target'), 'unchanged'); symlinkSync('target', path);
  assert.throws(() => configuration(root, {}), /regular file/);
  assert.equal(readFileSync(join(root, 'target'), 'utf8'), 'unchanged');
});
test('an occupied port fails without closing the existing listener', async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  await assert.rejects(checkPort(server.address().port), /unavailable/);
  assert.equal(server.listening, true);
});
test('private token values stay literal and are not made public', t => {
  const root = fixture(t, 'SERVICE_API_TOKEN=private$literal\n');
  const env = configuration(root, {});
  assert.equal(env.SERVICE_API_TOKEN, 'private$literal');
  assert.equal(env.NEXT_PUBLIC_SERVICE_API_TOKEN, undefined);
});

test('native remote HTTPS remains explicit and cannot inherit Docker authorization', t => {
  const root = fixture(t);
  writeFileSync(join(root, '.env.local'), 'APP_PORT=3001\nFOOTBALL_API_BASE_URL=https://backend.example.invalid\n');
  const env = configuration(root, { GOALSTATS_LOCAL_DOCKER: '1' });
  assert.equal(env.FOOTBALL_API_BASE_URL, 'https://backend.example.invalid');
  assert.equal(env.GOALSTATS_LOCAL_DOCKER, '');
  assert.equal(env.NODE_ENV, 'development');
});
