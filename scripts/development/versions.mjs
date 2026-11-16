import { pathToFileURL } from 'node:url';

export function supportedVersion(kind, version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  if (kind === 'node') return major === 24 && (minor > 22 || (minor === 22 && patch >= 3));
  if (kind === 'npm') return major === 11 && (minor > 19 || (minor === 19 && patch >= 1));
  return false;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const kind = process.argv[2];
  process.exitCode = supportedVersion(kind, kind === 'node' ? process.versions.node : process.argv[3]) ? 0 : 1;
}
