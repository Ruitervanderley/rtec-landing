#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

read_env_value() {
  local key="$1"
  awk -F= -v search_key="$key" '$1 == search_key { print substr($0, index($0, "=") + 1); exit }' .env
}

set_env_value() {
  local key="$1"
  local value="$2"
  local temp_file
  temp_file="$(mktemp)"

  if grep -q "^${key}=" .env; then
    sed "s|^${key}=.*|${key}=${value}|" .env > "$temp_file"
  else
    cat .env > "$temp_file"
    printf '\n%s=%s\n' "$key" "$value" >> "$temp_file"
  fi

  mv "$temp_file" .env
}

wait_for_container_health() {
  local container_name="$1"
  local timeout_seconds="${2:-180}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    local status
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_name" 2>/dev/null || true)"

    if [ "$status" = "healthy" ] || [ "$status" = "running" ]; then
      echo "[INFO] $container_name status: $status"
      return 0
    fi

    if [ "$status" = "unhealthy" ] || [ "$status" = "exited" ] || [ "$status" = "dead" ]; then
      echo "[ERROR] $container_name status: $status"
      docker logs --tail 80 "$container_name" || true
      return 1
    fi

    if [ $(( "$(date +%s)" - started_at )) -ge "$timeout_seconds" ]; then
      echo "[ERROR] Timed out waiting for $container_name health status."
      docker logs --tail 80 "$container_name" || true
      return 1
    fi

    sleep 5
  done
}

smoke_check_api_local() {
  docker exec rtec-ops-api node -e "fetch('http://127.0.0.1:4000/v1/admin/health', { headers: { Authorization: 'Bearer ' + process.env.OPS_ADMIN_SERVICE_TOKEN } }).then(async (response) => { if (!response.ok) { console.error(await response.text()); process.exit(1); } const payload = await response.json(); const databaseOk = payload.dependencies?.database?.ok === true; const supabaseOk = payload.dependencies?.supabase?.ok === true; process.exit(databaseOk && supabaseOk ? 0 : 1); }).catch((error) => { console.error(error); process.exit(1); });"
}

smoke_check_panel_local() {
  docker exec rtec-ops-panel node -e "fetch('http://127.0.0.1:3001/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch((error) => { console.error(error); process.exit(1); });"
}

smoke_check_external() {
  local url="$1"
  local attempts="${2:-5}"
  local delay_seconds="${3:-5}"

  for _ in $(seq 1 "$attempts"); do
    if curl --fail --silent --show-error "$url" >/dev/null; then
      return 0
    fi

    sleep "$delay_seconds"
  done

  return 1
}

if [ ! -f .env ]; then
  echo "[ERROR] Missing .env. Copy .env.example to .env and fill secrets."
  exit 1
fi

TARGET_IMAGE_TAG="${DEPLOY_IMAGE_TAG:-$(read_env_value IMAGE_TAG)}"
TARGET_IMAGE_TAG="${TARGET_IMAGE_TAG:-main}"
API_HEALTHCHECK_URL="${DEPLOY_API_HEALTHCHECK_URL:-}"
PANEL_HEALTHCHECK_URL="${DEPLOY_PANEL_HEALTHCHECK_URL:-}"

if [ -z "$API_HEALTHCHECK_URL" ]; then
  API_HEALTHCHECK_URL="$(read_env_value NEXT_PUBLIC_NOC_API_URL)"
  API_HEALTHCHECK_URL="${API_HEALTHCHECK_URL:-https://api.rtectecnologia.com.br}"
  API_HEALTHCHECK_URL="${API_HEALTHCHECK_URL%/}/health"
fi

if [ -z "$PANEL_HEALTHCHECK_URL" ]; then
  PANEL_HEALTHCHECK_URL="$(read_env_value PANEL_PUBLIC_URL)"
  PANEL_HEALTHCHECK_URL="${PANEL_HEALTHCHECK_URL:-https://painel.rtectecnologia.com.br}"
  PANEL_HEALTHCHECK_URL="${PANEL_HEALTHCHECK_URL%/}/api/health"
fi

echo "[INFO] Deploying image tag: $TARGET_IMAGE_TAG"
set_env_value IMAGE_TAG "$TARGET_IMAGE_TAG"

echo "[INFO] Pulling containers from GHCR..."
docker compose pull

echo "[INFO] Starting stack..."
docker compose up -d --force-recreate

echo "[INFO] Waiting for health checks..."
wait_for_container_health rtec-ops-api
wait_for_container_health rtec-ops-panel

echo "[INFO] Running local smoke checks..."
smoke_check_api_local
smoke_check_panel_local

echo "[INFO] Running external smoke checks..."
smoke_check_external "$API_HEALTHCHECK_URL"
smoke_check_external "$PANEL_HEALTHCHECK_URL"

echo "[INFO] Stack status:"
docker compose ps
