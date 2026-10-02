#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

action=${1:-contributor}
case "$action" in contributor|e2e) ;; *) echo 'Error: use contributor or e2e.' >&2; exit 2 ;; esac
docker info >/dev/null 2>&1 || { echo 'Error: Docker is not running.' >&2; exit 2; }

project="goal-stats-app-test-$(date +%s)-$$-$RANDOM"
tool_image="$project-tooling"
browser_image="$project-browser"
export APP_TEST_IMAGE="$project-runtime"
container="$project-runner"
compose=(docker compose -p "$project" -f docker/compose.test.yml)
started=false

cleanup() {
  status=$?
  trap - EXIT INT TERM
  docker rm -f "$container" >/dev/null 2>&1 || true
  if [[ "$started" == true ]]; then
    if (( status != 0 )); then "${compose[@]}" logs --no-color --tail 100 >&2 || true; fi
    "${compose[@]}" down --volumes --remove-orphans >/dev/null || status=1
  fi
  for image in "$tool_image" "$browser_image" "$APP_TEST_IMAGE"; do
    docker image inspect "$image" >/dev/null 2>&1 && docker image rm "$image" >/dev/null || true
  done
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo 'Building frontend tooling image...'
docker build --target tooling -t "$tool_image" .
echo 'Running lint, TypeScript, and unit/component tests...'
docker run --rm --name "$container" --network none "$tool_image" sh -c \
  'npm run lint && npm run typecheck && npm run test:unit'

if [[ "$action" == e2e ]]; then
  echo 'Preparing isolated browser E2E runtime...'
  docker build --target runtime -t "$APP_TEST_IMAGE" .
  docker build --target browser -t "$browser_image" .
  started=true
  "${compose[@]}" up -d --wait --wait-timeout 120 app-under-test
  docker run --rm --init --name "$container" --network "${project}_default" --shm-size=1g \
    -e APP_TEST_BASE_URL=http://app-under-test:3000 "$browser_image" npm run test:e2e
fi

echo 'Frontend checks passed.'
