#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
uv run pytest tests/ -m "integration" -v "$@"
