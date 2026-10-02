#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

action=${1:-help}
env_file=.env.local
example=.env.example
project=goal-stats-app-local
compose=(docker compose --env-file "$env_file" -p "$project" -f docker/compose.local.yml)

fail() { echo "Error: $*" >&2; exit 2; }
step() { printf '\n==> %s\n' "$1"; }

check_tools() {
  command -v docker >/dev/null || fail 'Docker is required. Install/start Docker Desktop or Docker Engine.'
  command -v make >/dev/null || fail 'GNU Make is required.'
  docker compose version >/dev/null || fail 'Docker Compose v2 is required.'
  docker info >/dev/null 2>&1 || fail 'Docker is not running. Start it and retry.'
}

prepare_env() {
  [[ -f "$example" ]] || fail '.env.example is missing.'
  if [[ ! -e "$env_file" ]]; then
    cp "$example" "$env_file"
    chmod 600 "$env_file" 2>/dev/null || true
    echo 'Created .env.local from .env.example.'
  elif [[ ! -f "$env_file" || -L "$env_file" ]]; then
    fail '.env.local must be a regular file, not a directory or symlink.'
  else
    echo 'Preserving existing .env.local.'
  fi
  grep -Eq '^APP_PORT=[0-9]+$' "$env_file" || fail '.env.local requires a numeric APP_PORT.'
  grep -Eq '^FOOTBALL_API_BASE_URL=https?://.+$' "$env_file" || fail '.env.local requires FOOTBALL_API_BASE_URL.'
  grep -Eq '^SERVICE_API_BASE_URL=https?://.+$' "$env_file" || fail '.env.local requires SERVICE_API_BASE_URL.'
  "${compose[@]}" config --quiet
}

case "$action" in
  help)
    printf '%s\n' \
      'GoalStats frontend' \
      '' \
      '  make setup   Prepare local configuration and Docker images; start nothing' \
      '  make run     Start/update the frontend development container' \
      '  make test    Run lint, types, and unit/component tests' \
      '  make stop    Stop this repository local frontend stack' \
      '  make help    Show this help' \
      '' \
      'Start the backend first, then: make setup && make run' \
      'Goal Stats: http://127.0.0.1:3000/demo'
    ;;
  setup)
    step 'Checking required tools'
    check_tools
    step 'Preparing local configuration'
    prepare_env
    step 'Building development and tooling images'
    "${compose[@]}" build app
    docker build --target tooling -t goal-stats-app:tooling .
    echo
    echo 'Setup complete; no services were started. Next: make run'
    ;;
  run)
    check_tools
    [[ -f "$env_file" ]] || fail '.env.local is missing. Run make setup first.'
    prepare_env
    app_port=$(awk -F= '$1 == "APP_PORT" { sub(/^[^=]*=/, ""); print; exit }' "$env_file")
    step 'Building and starting the frontend'
    if ! "${compose[@]}" up -d --build --wait --wait-timeout 180 app; then
      echo 'Docker reported a startup race; checking the owned container once more...' >&2
      if ! "${compose[@]}" up -d --wait --wait-timeout 180 app; then
        echo 'Frontend startup failed. Maintainers can inspect logs with make _logs.' >&2
        exit 1
      fi
    fi
    echo
    echo 'GoalStats frontend is ready:'
    echo "  Website: http://127.0.0.1:$app_port"
    echo "  Football demo: http://127.0.0.1:$app_port/demo"
    ;;
  stop)
    check_tools
    [[ -f "$env_file" ]] || fail '.env.local is missing. Nothing is configured to stop.'
    "${compose[@]}" down --remove-orphans
    echo 'GoalStats frontend stopped. Build and Next.js caches were preserved.'
    ;;
  logs)
    check_tools
    [[ -f "$env_file" ]] || fail '.env.local is missing. Run make setup first.'
    exec "${compose[@]}" logs -f app
    ;;
  *) fail 'Use setup, run, test, stop, or help.' ;;
esac
