#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  echo "[ERROR] Missing .env. Copy .env.example to .env and fill secrets."
  exit 1
fi

echo "[INFO] Pull/build containers..."
docker compose pull || true
docker compose build --pull

echo "[INFO] Starting stack..."
docker compose up -d

echo "[INFO] Stack status:"
docker compose ps
