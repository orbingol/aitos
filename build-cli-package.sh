#!/bin/bash

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 1.0.0"
  exit 1
fi

VERSION="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
DIST_DIR="$REPO_ROOT/dist"
STAGE_DIR="$(mktemp -d)"
PACKAGE_DIR="$STAGE_DIR/aitos-cli-${VERSION}"
TARBALL_PATH="$DIST_DIR/aitos-cli-${VERSION}.tar.gz"
CHECKSUM_PATH="$DIST_DIR/aitos-cli-${VERSION}.sha256"

trap 'rm -rf "$STAGE_DIR"' EXIT

mkdir -p "$PACKAGE_DIR" "$DIST_DIR"

cp "$REPO_ROOT/cli/aitos-analyzer.sh" "$PACKAGE_DIR/"
cp "$REPO_ROOT/cli/aitos-builder.sh" "$PACKAGE_DIR/"
cp -R "$REPO_ROOT/cli/prompts" "$PACKAGE_DIR/"
cp "$REPO_ROOT/cli/README.md" "$PACKAGE_DIR/"
cp "$REPO_ROOT/LICENSE" "$PACKAGE_DIR/"

chmod +x "$PACKAGE_DIR/"*.sh
tar -C "$STAGE_DIR" -czf "$TARBALL_PATH" "aitos-cli-${VERSION}"

SHA256="$(shasum -a 256 "$TARBALL_PATH" | awk '{print $1}')"
printf '%s  %s\n' "$SHA256" "$(basename "$TARBALL_PATH")" > "$CHECKSUM_PATH"

echo "Release tarball created: $TARBALL_PATH"
echo "SHA256: $SHA256"
echo "Checksum file: $CHECKSUM_PATH"
echo "Next steps:"
echo "1. Upload $(basename "$TARBALL_PATH") to GitHub Releases for tag v${VERSION}."
echo "2. Update Formula/aitos-cli.rb with sha256 \"$SHA256\"."
echo "3. Commit the formula change to your tap repository."
