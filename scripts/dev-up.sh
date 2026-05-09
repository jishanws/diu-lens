#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "====================================="
echo " DIU Lens - Local Development Up"
echo "====================================="
echo

echo "[1/4] Ensuring Python dependencies..."
(
  cd "$ROOT_DIR/apps/api"
  if [[ ! -d ".venv" ]]; then
    python3 -m venv .venv
  fi
  .venv/bin/pip install -r requirements.txt > /dev/null 2>&1
)
echo "✓ Python dependencies verified."

echo "[2/4] Ensuring Node dependencies..."
(
  cd "$ROOT_DIR"
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "ERROR: pnpm is required but not installed."
    exit 1
  fi
  pnpm install > /dev/null 2>&1
)
echo "✓ Node dependencies verified."

echo "[3/4] Verifying local environment files..."
if [[ ! -f "$ROOT_DIR/apps/api/.env" ]]; then
  if [[ -f "$ROOT_DIR/apps/api/.env.example" ]]; then
    cp "$ROOT_DIR/apps/api/.env.example" "$ROOT_DIR/apps/api/.env"
    echo "✓ Created apps/api/.env from example."
  else
    echo "ERROR: apps/api/.env is missing and no example found."
  fi
fi
if [[ ! -f "$ROOT_DIR/apps/web/.env.local" ]]; then
  echo "NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000" > "$ROOT_DIR/apps/web/.env.local"
  echo "✓ Created apps/web/.env.local"
else
  if ! grep -q "NEXT_PUBLIC_API_BASE_URL" "$ROOT_DIR/apps/web/.env.local"; then
    echo "NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000" >> "$ROOT_DIR/apps/web/.env.local"
    echo "✓ Updated apps/web/.env.local with NEXT_PUBLIC_API_BASE_URL"
  fi
fi

echo "[4/4] Starting development servers..."
exec "$ROOT_DIR/scripts/devctl.sh" dev
