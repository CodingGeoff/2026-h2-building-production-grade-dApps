#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
exec node ./node_modules/ts-node/dist/bin.js ./src/index.ts "$@"
