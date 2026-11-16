import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportedVersion } from './versions.mjs';

for (const version of ['24.22.3', '24.22.4', '24.23.0']) {
  test(`Node policy accepts ${version}`, () => assert.equal(supportedVersion('node', version), true));
}
for (const version of ['20.19.6', '22.22.2', '24.21.9', '24.22.2', '25.0.0', '26.0.0', '24.22.3-rc.1', 'invalid']) {
  test(`Node policy rejects ${version}`, () => assert.equal(supportedVersion('node', version), false));
}
for (const version of ['11.19.1', '11.20.0']) {
  test(`npm policy accepts ${version}`, () => assert.equal(supportedVersion('npm', version), true));
}
for (const version of ['10.9.8', '11.19.0', '12.0.0', 'invalid']) {
  test(`npm policy rejects ${version}`, () => assert.equal(supportedVersion('npm', version), false));
}
