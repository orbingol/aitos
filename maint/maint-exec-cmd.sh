#!/bin/bash
set -euo pipefail

corepack enable || true
corepack prepare yarn@4.9.4 --activate

MAINT_CMD="${MAINT_CMD:-yarn install}"

# Basic validation to avoid executing arbitrary shell syntax via MAINT_CMD.
# Allow simple commands and arguments; reject obvious shell metacharacters.
if printf '%s' "$MAINT_CMD" | grep -q '[;&|><`$(){}]'; then
  printf 'Error: MAINT_CMD contains unsafe shell characters and will not be executed.\n' >&2
  exit 1
fi

printf 'Running maintenance command: %s\n' "$MAINT_CMD"

# Convert MAINT_CMD into positional parameters and execute without using "sh -c".
# This preserves word-based arguments while avoiding an extra layer of shell parsing.
set -- $MAINT_CMD
"$@"
