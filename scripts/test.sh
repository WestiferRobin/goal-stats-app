#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
action=${1-test}
e2e=${2-false}
fail() { echo "Error: $*" >&2; exit 2; }
case "$action" in unit|test) ;; *) fail 'Use unit or test.' ;; esac
case "$e2e" in true|false) ;; *) fail "Unsupported E2E=$e2e. Use exactly true or false." ;; esac
case "${ENV-local}" in local|dev) ;; *) fail "Unsupported ENV=${ENV}. Use local or dev." ;; esac
project="app-test-$(date +%s)-$$-$RANDOM"
tool_image="$project-tooling"
browser_image="$project-browser"
export APP_TEST_IMAGE="$project-runtime"
container="$project-runner"
compose=(docker compose --env-file /dev/null -p "$project" -f docker/compose.test.yml)
started=false
cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if docker container inspect "$container" >/dev/null 2>&1; then
    docker rm -f "$container" >/dev/null || status=1
  fi
  if [[ "$started" == true ]]; then
    if (( status != 0 )); then "${compose[@]}" logs --no-color --tail 100 >&2 || true; fi
    "${compose[@]}" down --volumes --remove-orphans || status=1
  fi
  for image in "$tool_image" "$browser_image" "$APP_TEST_IMAGE"; do
    if docker image inspect "$image" >/dev/null 2>&1; then
      docker image rm "$image" >/dev/null || status=1
    fi
  done
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
echo "Test resources: $project"
docker build --target tooling -t "$tool_image" .
echo 'Running source unit/component tests (E2E excluded).'
docker run --rm --name "$container" --network none "$tool_image" npm run test:unit
if [[ "$action" == test && "$e2e" == true ]]; then
  echo 'Unit/component tests passed. Preparing isolated browser E2E.'
  docker build --target runtime -t "$APP_TEST_IMAGE" .
  docker build --target browser -t "$browser_image" .
  started=true
  "${compose[@]}" up -d --wait --wait-timeout 120 app-under-test
  docker run --rm --init --name "$container" --network "${project}_default" --shm-size=1g \
    -e APP_TEST_BASE_URL=http://app-under-test:3000 "$browser_image" npm run test:e2e
fi
