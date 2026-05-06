#!/bin/sh
# health-check.sh - Health check for Docker container
# Returns 0 if healthy, 1 if unhealthy

HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
TIMEOUT="${HEALTH_TIMEOUT:-5}"
MAX_RETRIES="${HEALTH_RETRIES:-3}"
RETRY_DELAY="${RETRY_DELAY:-2}"

check_health() {
  wget --no-verbose --tries=1 --timeout=$TIMEOUT -O - "$HEALTH_URL" 2>/dev/null
}

for i in $(seq 1 $MAX_RETRIES); do
  RESPONSE=$(check_health)
  HTTP_CODE=$?

  if [ $HTTP_CODE -eq 0 ]; then
    # Check if response contains "UP" or "200" status
    if echo "$RESPONSE" | grep -q '"status":"UP"\|"UP"'; then
      echo "✅ Health check passed (attempt $i/$MAX_RETRIES)"
      exit 0
    fi

    # Also accept any 200 response
    if echo "$RESPONSE" | head -1 | grep -q '"UP"\|"DEGRADED"'; then
      echo "✅ Health check passed (attempt $i/$MAX_RETRIES)"
      exit 0
    fi
  fi

  if [ $i -lt $MAX_RETRIES ]; then
    echo "⚠️  Health check failed (attempt $i/$MAX_RETRIES), retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  fi
done

echo "❌ Health check failed after $MAX_RETRIES attempts"
exit 1
