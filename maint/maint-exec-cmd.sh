#!/bin/bash
set -euo pipefail

corepack enable || true
corepack prepare yarn@4.9.4 --activate

MAINT_CMD="${MAINT_CMD:-yarn install}"
printf 'Running maintenance command: %s\n' "$MAINT_CMD"
sh -c "$MAINT_CMD"
