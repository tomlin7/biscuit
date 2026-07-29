import os
import tempfile
from unittest.mock import MagicMock, PropertyMock, patch

import pytest
import toml

from biscuit.settings.config import Config
from biscuit.settings.bindings import Bindings
from biscuit.settings.settings import Formattable


class TestConfig:
    @pytest.fixture
    def config(self, mock_base):
        cfg = Config.__new__(Config)
        cfg.base = mock_base
        cfg.data = {}
        return cfg

    def test_get_value_default(self, config):
        assert config.get_value("nonexistent", "default") == "default"

    def test_get_value_existing(self, config):
        config.data = {"font": "Fira Code"}
        assert config.get_value("font", "default") == "Fira Code"

    def test_get_value_none_default(self, config):
        assert config.get_value("nonexistent", None) is None

    def test_setup_properties_defaults(self, config):
        config.data = {}
        config.setup_properties()
        assert config.font == ("Fira Code", 12)
        assert config.uifont == ("Fira Code", 10)
        assert config.auto_save_enabled is False
        assert config.tab_size == 4
        assert config.vim_mode is False
        assert config.show_minimap is True

    def test_setup_properties_custom(self, config):
        config.data = {
            "font": "JetBrains Mono",
            "font_size": 14,
            "tab_size": 2,
            "vim_mode": True,
            "theme": "light",
        }
        config.setup_properties()
        assert config.font == ("JetBrains Mono", 14)
        assert config.tab_size == 2
        assert config.vim_mode is True

    def test_setup_properties_theme_dark(self, config):
        config.data = {"theme": "dark"}
        config.setup_properties()
        assert "VSCodeDark" in config.theme.__class__.__name__

    def test_setup_properties_theme_light(self, config):
        config.data = {"theme": "light"}
        config.setup_properties()
        assert "VSCodeLight" in config.theme.__class__.__name__

    def test_setup_properties_theme_unknown_defaults_to_dark(self, config):
        config.data = {"theme": "nonexistent"}
        config.setup_properties()
        assert config.theme is not None

    def test_save_writes_file(self, config):
        with tempfile.TemporaryDirectory() as tmpdir:
            config.base.configdir = tmpdir
            config.config_path = os.path.join(tmpdir, "settings.toml")
            config.data = {"font_size": 14}
            config.save()
            assert os.path.exists(config.config_path)
            with open(config.config_path) as f:
                data = toml.load(f)
            assert data["font_size"] == 14

    def test_set_value_updates_and_saves(self, config):
        with tempfile.TemporaryDirectory() as tmpdir:
            config.base.configdir = tmpdir
            config.config_path = os.path.join(tmpdir, "settings.toml")
            config.base.refresh_editors = MagicMock()
            config.set_value("tab_size", 8)
            assert config.data["tab_size"] == 8
            assert os.path.exists(config.config_path)


class TestBindings:
    def test_default_bindings(self):
        base = MagicMock()
        settings = MagicMock()
        settings.base = base
        bindings = Bindings(settings)
        assert bindings.new_file == "<Control-n>"
        assert bindings.save == "<Control-s>"
        assert bindings.quit == "<Control-q>"
        assert bindings.command_palette == "<Control-P>"
        assert bindings.open_settings == "<Control-comma>"

    def test_all_bindings_present(self):
        base = MagicMock()
        bindings = Bindings(MagicMock())
        expected = [
            "new_file", "new_window", "open_file", "open_dir",
            "save", "save_as", "close_file", "goto_line",
            "quit", "undo", "redo", "restore_closed_tab",
            "close_all_tabs", "change_tab", "change_tab_back",
            "split_tab", "command_palette", "file_search",
            "symbol_outline", "panel", "sidebar",
            "secondary_sidebar", "directory_tree", "extensions",
            "global_search", "debugger", "git", "assistant",
            "logs", "open_settings", "restore_recent_session",
            "open_recent_folders", "open_recent_files",
        ]
        for attr in expected:
            assert hasattr(bindings, attr), f"Missing binding: {attr}"


class TestFormattable:
    def test_format_with_url(self):
        f = Formattable("clone {}")
        result = f.format("https://github.com/user/repo.git")
        assert result == "clone https://github.com/user/repo.git"

    def test_format_with_github_path(self):
        f = Formattable("clone {}")
        result = f.format("user/repo")
        assert result == "clone https://github.com/user/repo"

    def test_format_with_none(self):
        f = Formattable("clone {}")
        result = f.format(None)
        assert result == "clone None"
