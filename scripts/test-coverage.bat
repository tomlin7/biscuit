@echo off
uv run pytest tests/ -v --cov=src --cov-report=term --cov-report=html %*
