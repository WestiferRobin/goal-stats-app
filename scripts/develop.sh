#!/usr/bin/env bash
# Public lifecycle: native run, local Docker deploy, frontend-only stop.
set -euo pipefail
cd "$(dirname "$0")/.."
action=${1:-help}
env_file=.env.local
project=goal-stats-app-local
compose=(docker compose --env-file "$env_file" -p "$project" -f docker/compose.local.yml)
fail() { echo "Error: $*" >&2; exit 2; }
step() { printf '\n==> %s\n' "$1"; }
check_node() {
  command -v node >/dev/null || fail 'Native development requires Node.js >=24.22.3 <25 and npm; Docker-only development can use make deploy.'
  node scripts/development/versions.mjs node || fail 'Select Node.js >=24.22.3 <25 (nvm use); Docker deploy needs no host Node.'
  command -v npm >/dev/null || fail 'npm is required for native development.'
  node scripts/development/versions.mjs npm "$(npm --version)" || fail 'Native development requires npm >=11.19.1 <12.'
}
check_docker() {
  command -v docker >/dev/null || fail 'Docker is required.'
  docker compose version >/dev/null || fail 'Docker Compose V2 is required (target compatibility: 2.22.0).'
  docker info >/dev/null 2>&1 || fail 'Docker is not running. Start it and retry.'
  for key in COMPOSE_FILE COMPOSE_PROJECT_NAME COMPOSE_PROFILES COMPOSE_ENV_FILES COMPOSE_PATH_SEPARATOR APP_PORT FOOTBALL_API_BASE_URL SERVICE_API_TOKEN; do
    [[ -z ${!key+x} ]] || fail "Unsupported inherited $key; configure .env.local instead (value omitted)."
  done
}
require_env() {
  [[ -f "$env_file" && ! -L "$env_file" ]] || fail '.env.local must be a regular file. Run make setup or copy .env.example for Docker-only development.'
}
validate_native() { require_env; app_port=$(node scripts/development/local.mjs config); }
validate_docker() {
  require_env
  # Compose validates/interpolates configuration without host Node/npm or shell-sourcing secrets.
  "${compose[@]}" config --quiet
}
case "$action" in
  help)
    printf '%s\n' \
      'GoalStats frontend — native or local Docker development' \
      '  make setup   Prepare configuration, host dependencies and Docker images; start nothing' \
      '  make run     Run native Next.js in foreground; Ctrl+C stops it (Node >=24.22.3 <25; npm >=11.19.1 <12)' \
      '  make deploy  Build/start local Docker frontend; wait for readiness (no host Node required)' \
      '  make test    Run frontend quality and regression checks in isolated Docker' \
      '  make stop    Stop only frontend Docker resources; preserve volumes' \
      '  make help    Display these commands' \
      '' 'Start the backend separately. Frontend commands never manage backend services or data.' \
      'Native: make setup && make run; .env.local defaults to http://127.0.0.1:5100.' \
      'Docker-only: copy .env.example to .env.local if missing, then make deploy.' \
      'Docker always reaches http://host.docker.internal:5100; no Render dependency.' \
      'APP_PORT defaults to 3000. Set a free port in .env.local; no other process is stopped.' \
      'Run lifecycle commands sequentially. Native mode stops with Ctrl+C; make stop is Docker-only.'
    ;;
  setup)
    check_node; check_docker
    [[ -f .env.example ]] || fail '.env.example is missing.'
    if [[ ! -e "$env_file" && ! -L "$env_file" ]]; then
      cp .env.example "$env_file"; chmod 600 "$env_file"
      echo 'Created .env.local from .env.example.'
    else
      echo 'Preserving existing .env.local.'
    fi
    validate_native; validate_docker
    step 'Installing host dependencies from the lockfile'
    npm ci
    step 'Building development and tooling images'
    "${compose[@]}" build app
    docker build --target tooling -t goal-stats-app:tooling .
    echo 'Setup complete; no services started. Next: make run or make deploy.'
    ;;
  run)
    check_node; validate_native
    [[ -f node_modules/next/dist/bin/next ]] || fail 'Host dependencies missing; run make setup.'
    echo "Starting native Next.js at http://127.0.0.1:$app_port/teams; Ctrl+C stops it."
    exec node scripts/development/local.mjs run
    ;;
  deploy)
    check_docker; validate_docker
    step 'Building the frontend'
    "${compose[@]}" build app
    step 'Starting Docker frontend'
    # Separate build/up for Compose 2.22. Docker owns the bind check and fails
    # explicitly on occupied ports; never fall back to another port or stop its owner.
    if ! "${compose[@]}" up -d --wait --wait-timeout 180 app; then
      echo 'Frontend startup failed. Check APP_PORT for conflicts and inspect make _logs. No unrelated process was stopped.' >&2
      exit 1
    fi
    address=$("${compose[@]}" port app 3000)
    echo "Docker frontend ready: http://$address/teams"
    ;;
  stop|logs)
    check_docker; validate_docker
    if [[ "$action" == logs ]]; then exec "${compose[@]}" logs -f app; fi
    "${compose[@]}" down --remove-orphans
    echo 'Frontend Docker resources stopped; volumes preserved. Native Next.js stops with Ctrl+C in its terminal.'
    ;;
  *) fail 'Use setup, run, deploy, test, stop, or help.' ;;
esac
