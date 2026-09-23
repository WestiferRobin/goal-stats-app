#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
action=${1:?Missing action}
mode=${2-local}
project=${3:-app-$mode}
fail() { echo "Error: $*" >&2; exit 2; }
case "$mode" in local|dev) ;; *) fail "Unsupported ENV=$mode. Use local or dev." ;; esac
case "$action" in setup|build|run|stop|logs) ;; *) fail "Unknown action: $action" ;; esac
if [[ "$action" == setup ]]; then
  command -v docker >/dev/null || fail 'Docker is required.'
  make_version=$(make --version)
  [[ "$make_version" =~ GNU\ Make\ ([0-9]+)\.([0-9]+) ]] || fail 'GNU Make 3.81+ is required.'
  (( BASH_REMATCH[1] > 3 || (BASH_REMATCH[1] == 3 && BASH_REMATCH[2] >= 81) )) || fail 'GNU Make 3.81+ is required.'
  docker compose version || fail 'Docker Compose v2+ is required.'
  docker info >/dev/null || fail 'Start Docker Engine/Desktop, then retry.'
  echo 'Setup preserves configuration. Export HOME_API_BASE_URL to enable live Home; otherwise Home shows a recoverable unavailable state.'
  echo 'Setup complete; no services started. Next: make run'
  exit 0
fi
case "$project" in app-$mode|app-$mode-*) ;; *) fail "PROJECT must be app-$mode or start with app-$mode-." ;; esac
[[ "$project" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || fail 'Invalid Compose project name.'
if [[ "$mode" == local ]]; then APP_PORT=${APP_PORT-3000}; else APP_PORT=${APP_PORT-13000}; fi
[[ "$APP_PORT" =~ ^[0-9]{1,5}$ ]] && (( 10#$APP_PORT >= 1 && 10#$APP_PORT <= 65535 )) || fail 'APP_PORT must be an integer from 1 to 65535.'
export APP_PORT
compose=(docker compose --env-file /dev/null -p "$project" -f "docker/compose.$mode.yml")
case "$action" in
  build) "${compose[@]}" build app ;;
  run)
    if ! "${compose[@]}" up -d --build --wait --wait-timeout 180 app; then
      echo "App startup failed. Inspect: make logs ENV=$mode PROJECT=$project APP_PORT=$APP_PORT" >&2
      exit 1
    fi
    echo "App ready: http://127.0.0.1:$APP_PORT" ;;
  stop) "${compose[@]}" down ;;
  logs) exec "${compose[@]}" logs -f app ;;
esac
