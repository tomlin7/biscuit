@echo off
uv run pytest tests/ -m "not integration" -v %*
