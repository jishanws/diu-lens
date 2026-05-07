#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-https://api.diulens.app}"
API_ORIGIN="${API_ORIGIN:-https://www.diulens.app}"
API_PORT="${API_PORT:-8000}"
SERVICE_NAME="${SERVICE_NAME:-diu-lens-api}"
ENV_FILE="${ENV_FILE:-/etc/diu-lens/api.env}"
STORAGE_PATH="${STORAGE_PATH:-}"

redact_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "WARN: env file not found: $ENV_FILE"
    return 0
  fi

  sed -E 's/(SECRET|KEY|PASSWORD|TOKEN|DATABASE_URL|JWT_SECRET)=.*/\1=<redacted>/I' "$ENV_FILE"
}

section() {
  printf '\n== %s ==\n' "$1"
}

section "Public API health"
curl -i -sS --max-time 20 "$API_URL/health" -H "Origin: $API_ORIGIN" || true

section "Public API preflight"
curl -i -sS --max-time 20 -X OPTIONS "$API_URL/enroll" \
  -H "Origin: $API_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" || true

section "Local upstream health"
curl -i -sS --max-time 10 "http://127.0.0.1:$API_PORT/health" || true

section "Listening processes"
ss -ltnp | grep -E ":($API_PORT|80|443)\\b" || true

section "Systemd API service"
systemctl status "$SERVICE_NAME" --no-pager || true
journalctl -u "$SERVICE_NAME" -n 120 --no-pager || true

section "Docker containers"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || true
docker ps --filter "name=$SERVICE_NAME" --format '{{.Names}}' 2>/dev/null | while read -r container; do
  [[ -z "$container" ]] && continue
  docker inspect --format 'name={{.Name}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} status={{.State.Status}} exit={{.State.ExitCode}}' "$container" || true
  docker logs --tail 120 "$container" || true
done

section "Nginx config and logs"
nginx -t || true
grep -R "server_name api.diulens.app\\|proxy_pass\\|Access-Control-Allow" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true
tail -n 120 /var/log/nginx/api.diulens.error.log 2>/dev/null || true
tail -n 120 /var/log/nginx/error.log 2>/dev/null || true

section "TLS certificate"
echo | openssl s_client -connect api.diulens.app:443 -servername api.diulens.app 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName || true

section "Production env"
redact_env

if [[ -z "$STORAGE_PATH" && -f "$ENV_FILE" ]]; then
  STORAGE_PATH="$(grep -E '^STORAGE_PATH=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
fi

section "Storage path"
if [[ -z "$STORAGE_PATH" ]]; then
  echo "WARN: STORAGE_PATH is not set."
else
  mkdir -p "$STORAGE_PATH"
  test -w "$STORAGE_PATH"
  touch "$STORAGE_PATH/.write_test"
  rm -f "$STORAGE_PATH/.write_test"
  ls -ld "$STORAGE_PATH"
fi
