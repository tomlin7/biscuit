from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from biscuit.common.notifications import Notifications


class DependencyManager:
    """Manages extension dependencies in isolated `.deps` directories."""

    def __init__(self, logger: Any = None, notifications: Any = None) -> None:
        self.logger = logger
        self.notifications = notifications

    def load_manifest(self, ext_dir: Path | str) -> dict[str, Any]:
        """Loads manifest data from extension.toml or pyproject.toml."""
        ext_dir = Path(ext_dir)
        manifest_path = ext_dir / "extension.toml"
        if manifest_path.exists():
            try:
                import toml
                with open(manifest_path, "r", encoding="utf-8") as f:
                    return toml.load(f)
            except Exception as e:
                if self.logger:
                    self.logger.warning(f"Failed to parse {manifest_path}: {e}")

        # Fallback: parse pyproject.toml if extension.toml doesn't exist
        pyproject_path = ext_dir / "pyproject.toml"
        if pyproject_path.exists():
            try:
                import toml
                with open(pyproject_path, "r", encoding="utf-8") as f:
                    data = toml.load(f)
                poetry_data = data.get("tool", {}).get("poetry", {})
                deps = poetry_data.get("dependencies", {})
                python_pkgs = []
                for pkg, ver in deps.items():
                    if pkg.lower() in ("python", "biscuit-editor"):
                        continue
                    if isinstance(ver, str) and ver != "*" and not ver.startswith(("^", "~")):
                        python_pkgs.append(f"{pkg}=={ver}")
                    else:
                        python_pkgs.append(pkg)

                return {
                    "extension": {
                        "name": poetry_data.get("name", ext_dir.name),
                        "version": poetry_data.get("version", "0.1.0"),
                        "description": poetry_data.get("description", ""),
                    },
                    "dependencies": {
                        "python": python_pkgs,
                        "tools": [],
                    },
                }
            except Exception as e:
                if self.logger:
                    self.logger.warning(f"Failed to parse {pyproject_path}: {e}")

        return {}

    def get_declared_dependencies(self, ext_dir: Path | str) -> tuple[list[str], list[str]]:
        """Returns tuple of (python_packages, system_tools)."""
        ext_dir = Path(ext_dir)
        manifest = self.load_manifest(ext_dir)
        deps = manifest.get("dependencies", {})

        python_pkgs: list[str] = list(deps.get("python", []))
        tools: list[str] = list(deps.get("tools", []))

        # Check requirements.txt fallback / augmentation
        req_file = ext_dir / "requirements.txt"
        if req_file.exists():
            try:
                with open(req_file, "r", encoding="utf-8") as f:
                    for line in f:
                        clean_line = line.strip()
                        if clean_line and not clean_line.startswith("#"):
                            if clean_line not in python_pkgs:
                                python_pkgs.append(clean_line)
            except Exception as e:
                if self.logger:
                    self.logger.warning(f"Failed to read requirements.txt in {ext_dir}: {e}")

        return python_pkgs, tools

    def check_tools(self, ext_name: str, tools: list[str]) -> list[str]:
        """Checks if declared system tools are available on PATH.
        Returns a list of missing tools."""
        missing = []
        for tool in tools:
            tool_name = str(tool).strip()
            if not tool_name:
                continue
            if not shutil.which(tool_name):
                missing.append(tool_name)

        if missing:
            msg = f"Extension '{ext_name}' requires tools on PATH: {', '.join(missing)}"
            if self.logger:
                self.logger.warning(msg)
            if self.notifications:
                try:
                    self.notifications.warning(msg)
                except Exception:
                    pass

        return missing

    def ensure_dependencies(self, ext_dir: Path | str, force: bool = False) -> bool:
        """Installs Python dependencies into `<ext_dir>/.deps` if not already installed.
        Checks required CLI tools on PATH.
        Returns True if dependencies are satisfied or none required, False on failure."""
        ext_dir = Path(ext_dir)
        ext_name = ext_dir.name
        python_pkgs, tools = self.get_declared_dependencies(ext_dir)

        # Check declared CLI tools
        if tools:
            self.check_tools(ext_name, tools)

        if not python_pkgs:
            return True

        deps_dir = ext_dir / ".deps"
        installed_stamp = deps_dir / ".installed"

        # Unique environment signature (python major.minor + sorted requirements)
        env_sig = f"{sys.version_info.major}.{sys.version_info.minor}:" + ",".join(sorted(python_pkgs))
        current_hash = hashlib.sha256(env_sig.encode("utf-8")).hexdigest()

        if not force and installed_stamp.exists():
            try:
                with open(installed_stamp, "r", encoding="utf-8") as f:
                    stored_hash = f.read().strip()
                if stored_hash == current_hash and deps_dir.is_dir():
                    return True
            except Exception:
                pass

        deps_dir.mkdir(parents=True, exist_ok=True)
        if self.logger:
            self.logger.info(f"Installing dependencies for '{ext_name}' into {deps_dir}...")

        # 1. Prefer `uv pip install --target`
        success = False
        uv_path = shutil.which("uv")
        if uv_path:
            cmd = [uv_path, "pip", "install", "--target", str(deps_dir)] + python_pkgs
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=180,
                )
                if result.returncode == 0:
                    success = True
                else:
                    if self.logger:
                        self.logger.warning(f"uv pip install failed for {ext_name}: {result.stderr}")
            except Exception as e:
                if self.logger:
                    self.logger.warning(f"Failed to execute uv: {e}")

        # 2. Fallback to `python -m pip install --target`
        if not success:
            cmd = [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--no-warn-script-location",
                "--target",
                str(deps_dir),
            ] + python_pkgs
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=240,
                )
                if result.returncode == 0:
                    success = True
                else:
                    if self.logger:
                        self.logger.error(f"pip install failed for {ext_name}: {result.stderr}")
                    if self.notifications:
                        try:
                            self.notifications.error(f"Failed to install dependencies for '{ext_name}'")
                        except Exception:
                            pass
                    return False
            except Exception as e:
                if self.logger:
                    self.logger.error(f"Exception during pip install for {ext_name}: {e}")
                if self.notifications:
                    try:
                        self.notifications.error(f"Failed to install dependencies for '{ext_name}': {e}")
                    except Exception:
                        pass
                return False

        if success:
            try:
                with open(installed_stamp, "w", encoding="utf-8") as f:
                    f.write(current_hash)
            except Exception:
                pass
            if self.logger:
                self.logger.info(f"Dependencies installed successfully for '{ext_name}'.")

        return success

    def add_to_sys_path(self, ext_dir: Path | str) -> Path | None:
        """Adds `<ext_dir>/.deps` to sys.path if it exists. Returns deps_dir if added or already present."""
        deps_dir = (Path(ext_dir) / ".deps").resolve()
        if deps_dir.is_dir():
            deps_str = str(deps_dir)
            if deps_str not in sys.path:
                sys.path.insert(0, deps_str)
            return deps_dir
        return None

    def remove_from_sys_path(self, ext_dir: Path | str) -> None:
        """Removes `<ext_dir>/.deps` from sys.path if present."""
        deps_dir = (Path(ext_dir) / ".deps").resolve()
        deps_str = str(deps_dir)
        if deps_str in sys.path:
            sys.path.remove(deps_str)

    def clean_dependencies(self, ext_dir: Path | str) -> bool:
        """Removes `<ext_dir>/.deps` directory."""
        deps_dir = Path(ext_dir) / ".deps"
        if deps_dir.exists():
            try:
                shutil.rmtree(deps_dir, ignore_errors=True)
                return True
            except Exception as e:
                if self.logger:
                    self.logger.warning(f"Failed to remove .deps in {ext_dir}: {e}")
                return False
        return True
