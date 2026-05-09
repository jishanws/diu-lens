#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-http://localhost:8000}"
echo "Testing DIU Lens API at $API_URL"

check_health() {
  echo "Checking /health..."
  curl -sS -f "$API_URL/health" > /dev/null
  echo "✅ Health OK"
}

check_root() {
  echo "Checking /..."
  curl -sS -f "$API_URL/" | grep -q "diu-lens"
  echo "✅ Root OK"
}

check_enroll_start() {
  echo "Checking /enroll (dry run/invalid payload)..."
  # This should return 422 if payload is missing fields
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/enroll" -H "Content-Type: application/json" -d '{}')
  if [[ "$status" == "422" ]]; then
    echo "✅ /enroll validation OK"
  else
    echo "❌ /enroll validation failed (expected 422, got $status)"
    return 1
  fi
}

check_admin_login_wrong_creds() {
  echo "Checking /auth/admin/login (invalid creds)..."
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"nonexistent@example.com", "password":"wrong"}')
  if [[ "$status" == "401" ]]; then
    echo "✅ /auth/admin/login 401 OK"
  else
    echo "❌ /auth/admin/login failed (expected 401, got $status)"
    return 1
  fi
}

check_rate_limit() {
  echo "Checking rate limiting on /auth/admin/login..."
  for i in {1..6}; do
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/admin/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"nonexistent@example.com", "password":"wrong"}')
    if [[ "$status" == "429" ]]; then
      echo "✅ Rate limit hit at request $i"
      return 0
    fi
  done
  echo "❌ Rate limit NOT hit (expected 429 after 5 requests)"
  return 1
}

check_health
check_root
check_enroll_start
check_admin_login_wrong_creds
check_rate_limit

echo "ALL SMOKE TESTS PASSED"
