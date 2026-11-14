#!/usr/bin/env bash
set -euo pipefail
exec > >(tee /artifacts/checks.log) 2>&1
node --version
npm --version
python --version
node -e 'if(process.versions.node!=="24.22.3")throw Error("Normalized runner requires Node 24.22.3")'
node -e 'if(require("node:child_process").execFileSync("npm",["--version"],{encoding:"utf8"}).trim()!=="11.19.1")throw Error("Normalized runner requires npm 11.19.1")'
python -B scripts/normalized/prepare.py
npm run lint
npm run typecheck
npm run test:unit -- --maxWorkers=1
npm run build
# Proxy permits loopback only in development. The production build is validated above.
python -m gunicorn --chdir /service --bind 127.0.0.1:5100 --workers 1 'main:create_app()' > /artifacts/flask.log 2>&1 &
flask_pid=$!
echo "$flask_pid" > /tmp/normalized-flask.pid
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000 > /artifacts/next.log 2>&1 &
next_pid=$!
trap 'kill "$next_pid" "$flask_pid" 2>/dev/null || true; wait "$next_pid" "$flask_pid" 2>/dev/null || true' EXIT
python -B scripts/normalized/wait.py
APP_E2E_MODE=normalized APP_TEST_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
# Preserve the existing Home/static Demo regression suite as a separate check.
APP_TEST_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- --output=/artifacts/home-demo-results
