from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from biscuit.debugger.config import ConfigLoader


class TestDebuggerConfigLoader:
    def test_check_clears_configs_when_no_active_directory(self):
        manager = MagicMock()
        manager.base = MagicMock()
        manager.base.active_directory = None

        loader = ConfigLoader(manager)
        loader.configs = [{"name": "Old Config"}]
        loader.config_found = True

        loader.check()

        assert loader.config_found is False
        assert loader.configs == []
        manager.base.debug.refresh.assert_called()
        manager.base.debug.refresh_configs.assert_called()

    def test_check_clears_configs_when_config_file_not_found(self, tmp_path):
        manager = MagicMock()
        manager.base = MagicMock()
        manager.base.active_directory = str(tmp_path)

        loader = ConfigLoader(manager)
        loader.configs = [{"name": "Old Config"}]
        loader.config_found = True

        loader.check()

        assert loader.config_found is False
        assert loader.configs == []
        manager.base.debug.refresh.assert_called()
        manager.base.debug.refresh_configs.assert_called()

    def test_check_loads_configs_when_file_exists(self, tmp_path):
        manager = MagicMock()
        manager.base = MagicMock()
        manager.base.active_directory = str(tmp_path)

        biscuit_dir = tmp_path / ".biscuit"
        biscuit_dir.mkdir()
        launch_file = biscuit_dir / "launch.toml"
        launch_file.write_text('[debug1]\nname = "Python: Current File"\n')

        loader = ConfigLoader(manager)
        loader.check()

        assert loader.config_found is True
        assert len(list(loader.configs)) == 1
        manager.base.debug.refresh_configs.assert_called()
