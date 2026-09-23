#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Archive the immutable contract commit, never run or edit the backend checkout.
canonical=6600facf42ecf9a3431b44f5d19ff2ac2a3b0b07
template_repo=${TEMPLATE_SOURCE:?Set TEMPLATE_SOURCE to a local template-goalstats-service Git checkout}
git -C "$template_repo" cat-file -e "$canonical^{commit}" || { echo 'Set TEMPLATE_SOURCE to the frozen Template repository.' >&2; exit 2; }
project="app-home-test-$(date +%s)-$$-$RANDOM"
export APP_TEST_IMAGE="$project-runtime" HOME_TEST_TEMPLATE_IMAGE="$project-template"
export HOME_TEST_DB_PASSWORD="disposable-$RANDOM-$RANDOM-$RANDOM"
browser_image="$project-browser"
container="$project-runner"
source_dir=$(mktemp -d "${TMPDIR:-/tmp}/goalstats-home-source.XXXXXX")
compose=(docker compose --env-file /dev/null -p "$project" -f docker/compose.home-test.yml)
artifacts="$PWD/artifacts/$project"
mkdir -p "$artifacts"
started=false
cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if docker container inspect "$container" >/dev/null 2>&1; then docker rm -f "$container" >/dev/null || status=1; fi
  if [[ "$started" == true ]]; then
    if (( status != 0 )); then "${compose[@]}" logs --no-color --tail 60 app-under-test template >&2 || true; fi
    "${compose[@]}" down --volumes --remove-orphans || status=1
  fi
  for image in "$browser_image" "$APP_TEST_IMAGE" "$HOME_TEST_TEMPLATE_IMAGE"; do
    if docker image inspect "$image" >/dev/null 2>&1; then docker image rm "$image" >/dev/null || status=1; fi
  done
  rm -rf "$source_dir"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
echo "Disposable Home test resources: $project; Template: $canonical"
git -C "$template_repo" archive "$canonical" | tar -x -C "$source_dir"
docker build --target runtime -t "$HOME_TEST_TEMPLATE_IMAGE" "$source_dir"
docker build --target runtime -t "$APP_TEST_IMAGE" .
docker build --target browser -t "$browser_image" .
started=true
"${compose[@]}" up -d --wait --wait-timeout 120 postgres redis
"${compose[@]}" run --rm --no-deps template alembic upgrade head
"${compose[@]}" up -d --wait --wait-timeout 180 template app-under-test
browser() {
  docker run --rm --init --name "$container" --network "${project}_default" --shm-size=1g \
    --mount "type=bind,src=$artifacts,dst=/artifacts" \
    -e APP_TEST_BASE_URL=http://app-under-test:3000 -e HOME_TEST_API_URL=http://template:8000 \
    -e HOME_TEST_NAME="$project" -e HOME_TEST_PHASE="$1" -e APP_E2E_MODE=live \
    "$browser_image" npm run test:e2e
}
browser create
# A real normal service/database restart, keeping the owned PostgreSQL volume.
"${compose[@]}" stop template postgres redis
"${compose[@]}" up -d --wait --wait-timeout 120 postgres redis
"${compose[@]}" up -d --wait --wait-timeout 120 template
browser persisted
"${compose[@]}" stop template
browser unavailable
"${compose[@]}" up -d --wait --wait-timeout 120 template
browser recovered
echo 'Live Home, restart persistence, backend outage and recovery: PASS'
