import hashlib
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import toml

from biscuit.extensions.dependencies import DependencyManager
from biscuit.extensions.manager import ExtensionManager


class TestDependencyManager:
    def test_load_manifest_extension_toml(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ext_dir = Path(tmpdir)
            manifest = {
                "extension": {
                    "id": "my_ext",
                    "name": "My Extension",
                    "version": "1.0.0",
                },
                "dependencies": {
                    "python": ["requests", "pydantic>=2.0"],
                    "tools": ["git", "node"],
                },
            }
            with open(ext_dir / "extension.toml", "w", encoding="utf-8") as f:
                toml.dump(manifest, f)

            mgr = DependencyManager()
            data = mgr.load_manifest(ext_dir)
            assert data["extension"]["name"] == "My Extension"
            assert data["dependencies"]["python"] == ["requests", "pydantic>=2.0"]
            assert data["dependencies"]["tools"] == ["git", "node"]

    def test_load_manifest_pyproject_fallback(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ext_dir = Path(tmpdir)
            pyproject = {
                "tool": {
                    "poetry": {
                        "name": "py_ext",
                        "version": "0.5.0",
                        "description": "Fallback ext",
                        "dependencies": {
                            "python": "^3.10",
                            "biscuit-editor": "^3.0.0",
                            "pytest": "*",
                            "rich": "^13.0.0",
                        },
                    }
                }
            }
            with open(ext_dir / "pyproject.toml", "w", encoding="utf-8") as f:
                toml.dump(pyproject, f)

            mgr = DependencyManager()
            data = mgr.load_manifest(ext_dir)
            assert data["extension"]["name"] == "py_ext"
            assert "rich" in data["dependencies"]["python"]
            assert "pytest" in data["dependencies"]["python"]
            assert "biscuit-editor" not in data["dependencies"]["python"]
            assert "python" not in data["dependencies"]["python"]

    def test_get_declared_dependencies_with_requirements(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ext_dir = Path(tmpdir)
            manifest = {
                "dependencies": {
                    "python": ["click"],
                    "tools": ["docker"],
                }
            }
            with open(ext_dir / "extension.toml", "w", encoding="utf-8") as f:
                toml.dump(manifest, f)

            with open(ext_dir / "requirements.txt", "w", encoding="utf-8") as f:
                f.write("# comment\nclick\nrequests>=2.0.0\n")

            mgr = DependencyManager()
            pkgs, tools = mgr.get_declared_dependencies(ext_dir)
            assert "click" in pkgs
            assert "requests>=2.0.0" in pkgs
            assert len(pkgs) == 2
            assert tools == ["docker"]

    def test_check_tools(self):
        mgr = DependencyManager()
        with patch("shutil.which") as mock_which:
            mock_which.side_effect = lambda t: "/usr/bin/git" if t == "git" else None
            missing = mgr.check_tools("test_ext", ["git", "missing_cli_tool"])
            assert missing == ["missing_cli_tool"]

    def test_ensure_dependencies_already_installed_cache(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ext_dir = Path(tmpdir)
            manifest = {
                "dependencies": {
                    "python": ["requests"],
                }
            }
            with open(ext_dir / "extension.toml", "w", encoding="utf-8") as f:
                toml.dump(manifest, f)

            deps_dir = ext_dir / ".deps"
            deps_dir.mkdir()
            env_sig = f"{sys.version_info.major}.{sys.version_info.minor}:requests"
            h = hashlib.sha256(env_sig.encode("utf-8")).hexdigest()
            with open(deps_dir / ".installed", "w", encoding="utf-8") as f:
                f.write(h)

            mgr = DependencyManager()
            with patch("subprocess.run") as mock_run:
                ok = mgr.ensure_dependencies(ext_dir)
                assert ok is True
                mock_run.assert_not_called()

    def test_ensure_dependencies_uv_install(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ext_dir = Path(tmpdir)
            manifest = {
                "dependencies": {
                    "python": ["requests"],
                    "tools": ["python"],
                }
            }
            with open(ext_dir / "extension.toml", "w", encoding="utf-8") as f:
                toml.dump(manifest, f)

            mgr = DependencyManager()
            mock_res = MagicMock()
            mock_res.returncode = 0
            with patch("shutil.which", return_value="C:\\path\\uv.exe"):
                with patch("subprocess.run", return_value=mock_res) as mock_run:
                    ok = mgr.ensure_dependencies(ext_dir)
                    assert ok is True
                    mock_run.assert_called_once()
                    assert (ext_dir / ".deps" / ".installed").exists()

    def test_add_and_remove_from_sys_path(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ext_dir = Path(tmpdir)
            deps_dir = ext_dir / ".deps"
            deps_dir.mkdir()

            mgr = DependencyManager()
            added = mgr.add_to_sys_path(ext_dir)
            assert added == deps_dir.resolve()
            assert str(deps_dir.resolve()) in sys.path

            mgr.remove_from_sys_path(ext_dir)
            assert str(deps_dir.resolve()) not in sys.path

    def test_clean_dependencies(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ext_dir = Path(tmpdir)
            deps_dir = ext_dir / ".deps"
            deps_dir.mkdir()
            (deps_dir / "test.txt").write_text("hello", encoding="utf-8")

            mgr = DependencyManager()
            assert deps_dir.exists()
            assert mgr.clean_dependencies(ext_dir) is True
            assert not deps_dir.exists()


class TestExtensionManagerDependencyIntegration:
    def test_extension_manager_delegation(self, mock_base):
        manager = ExtensionManager(mock_base)
        with tempfile.TemporaryDirectory() as tmpdir:
            ext_dir = Path(tmpdir) / "test_ext"
            ext_dir.mkdir()
            manifest = {
                "extension": {"name": "Test"},
                "dependencies": {"python": ["rich"], "tools": ["git"]},
            }
            with open(ext_dir / "extension.toml", "w", encoding="utf-8") as f:
                toml.dump(manifest, f)

            with patch.object(manager.dependency_manager, "ensure_dependencies", return_value=True) as mock_ensure:
                res = manager.ensure_dependencies(ext_dir)
                assert res is True
                mock_ensure.assert_called_once_with(ext_dir, force=False)

    def test_cli_deps_command(self):
        from biscuit.cli.extensions import deps
        with tempfile.TemporaryDirectory() as tmpdir:
            ext_dir = Path(tmpdir)
            manifest = {
                "dependencies": {
                    "python": ["pytest"],
                    "tools": ["python"],
                }
            }
            with open(ext_dir / "extension.toml", "w", encoding="utf-8") as f:
                toml.dump(manifest, f)

            with patch("pathlib.Path.cwd", return_value=ext_dir):
                with patch("click.echo") as mock_echo:
                    cmd_res = deps.callback(name=None, install=False, force=False)
                    assert cmd_res is None
                    echoed = [call.args[0] for call in mock_echo.call_args_list]
                    assert any("Python packages: pytest" in s for s in echoed)
                    assert any("System tools:" in s for s in echoed)
