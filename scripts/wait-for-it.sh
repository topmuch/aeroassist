#!/bin/sh
# wait-for-it.sh - Wait for a host/port to be available
# Source: https://github.com/vishnubob/wait-for-it (simplified)

HOST=""
PORT=""
TIMEOUT=15
QUIET=0
STRICT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    *:* )
      HOST=$(printf "%s\n" "$1" | cut -d : -f 1)
      PORT=$(printf "%s\n" "$1" | cut -d : -f 2)
      shift 1
      ;;
    --timeout=*)
      TIMEOUT="${1#*=}"
      shift 1
      ;;
    --strict)
      STRICT=1
      shift 1
      ;;
    --quiet|-q)
      QUIET=1
      shift 1
      ;;
    --)
      shift
      break
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [ -z "$HOST" ] || [ -z "$PORT" ]; then
  echo "Usage: $0 host:port [--timeout=seconds] [--strict] [--quiet] [-- command]" >&2
  exit 1
fi

echo "Waiting for $HOST:$PORT..." >&2

for i in $(seq $TIMEOUT -1 1); do
  if nc -z "$HOST" "$PORT" > /dev/null 2>&1; then
    [ $QUIET -eq 0 ] && echo "✅ $HOST:$PORT is available" >&2
    exec "$@"
    exit 0
  fi
  sleep 1
done

echo "❌ Timeout: $HOST:$PORT not available after ${TIMEOUT}s" >&2
[ $STRICT -eq 1 ] && exit 1
exit 0
