@echo off
uv run pytest tests/ -m "integration" -v %*
