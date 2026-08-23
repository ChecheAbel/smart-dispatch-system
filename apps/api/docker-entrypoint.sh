#!/bin/sh
set -e

upload_root="${UPLOAD_ROOT:-/var/smart-dispatch/uploads}"
mkdir -p "$upload_root"

if [ "$(id -u)" = "0" ]; then
  chown -R expressjs:nodejs "$upload_root" 2>/dev/null || true
  exec su-exec expressjs:nodejs node dist/index.js
fi

exec node dist/index.js
