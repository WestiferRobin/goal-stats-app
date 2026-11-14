import { readFileSync, lstatSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function configuration(root = process.cwd(), inherited = process.env) {
  const path = `${root}/.env.local`;
  let values;
  try {
    if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new Error();
    values = parseEnv(readFileSync(path, 'utf8'));
  } catch { throw new Error('.env.local must be a regular file. Run make setup first.'); }
  const port = values.APP_PORT;
  if (!/^\d+$/.test(port ?? '') || +port < 1 || +port > 65535) throw new Error('APP_PORT must be an integer from 1 to 65535 in .env.local.');
  try {
    const url = new URL(values.FOOTBALL_API_BASE_URL);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    if (url.hostname === 'host.docker.internal' || (url.hostname === '127.0.0.1' && url.port === '8000')) throw new Error();
  } catch { throw new Error('FOOTBALL_API_BASE_URL must be a host-accessible origin without /api/v1; local Flask uses http://127.0.0.1:5100. Docker selects its own origin.'); }
  for (const key of ['APP_PORT', 'FOOTBALL_API_BASE_URL', 'SERVICE_API_TOKEN']) {
    if (inherited[key] !== undefined && inherited[key] !== (values[key] ?? '')) throw new Error(`Conflicting inherited ${key}; use .env.local instead (value omitted).`);
  }
  if (inherited.PORT !== undefined && inherited.PORT !== port) throw new Error('Conflicting inherited PORT; use APP_PORT in .env.local.');
  return { ...inherited, ...values, APP_PORT: port, NODE_ENV: 'development', GOALSTATS_LOCAL_DOCKER: '', NEXT_TELEMETRY_DISABLED: '1' };
}

export async function checkPort(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () => reject(new Error(`Frontend port ${port} is unavailable. Choose a free APP_PORT in .env.local; no process was stopped.`)));
    server.listen({ port: Number(port), host: '127.0.0.1', exclusive: true }, () => server.close(resolve));
  });
}

async function main() {
  const action = process.argv[2];
  const env = configuration();
  if (action === 'config') { console.log(env.APP_PORT); return; }
  if (!['port', 'run'].includes(action)) throw new Error('Use config, port or run.');
  await checkPort(env.APP_PORT);
  if (action === 'port') return;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', env.APP_PORT], { env, stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.once('error', () => { console.error('Cannot start Next.js; run make setup.'); process.exitCode = 1; });
  child.once('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1); });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`Error: ${error.message}`); process.exitCode = 2; });
}
