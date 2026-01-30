#!/bin/bash
set -euo pipefail

if [[ $# -gt 0 ]]; then
  MAINT_CMD="$*"
else
  MAINT_CMD="yarn install"
fi

MAINT_CMD="$MAINT_CMD" docker compose -f docker-compose.maint.yml run --rm yarn-update
