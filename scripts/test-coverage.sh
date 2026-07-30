#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
uv run pytest tests/ -v --cov=src --cov-report=term --cov-report=html "$@"
