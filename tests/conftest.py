import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, PropertyMock

import pytest

os.environ["ENVIRONMENT"] = "test"


@pytest.fixture
def mock_base():
    base = MagicMock()
    base.testing = True
    base.active_directory = None
    base.git_found = False
    base.configdir = tempfile.gettempdir()
    base.datadir = Path(tempfile.mkdtemp())
    base.parentdir = tempfile.gettempdir()
    base.logger = MagicMock()
    base.notifications = MagicMock()
    base.config = MagicMock()
    base.config.font = ("Fira Code", 12)
    base.config.uifont = ("Fira Code", 10)
    base.config.tab_size = 4
    base.config.word_wrap = False
    base.config.cursor_style = "line"
    base.config.relative_line_numbers = False
    base.config.show_minimap = True
    base.config.show_linenumbers = True
    base.config.vim_mode = False
    base.config.render_indent_guides = True
    base.config.auto_save_enabled = False
    base.config.auto_closing_pairs = True
    base.config.auto_indent = True
    base.config.auto_surround = True
    base.theme = MagicMock()
    base.tab_spaces = 4
    base.wrap_words = False
    base.block_cursor = False
    base.relative_line_numbers = False
    base.show_minimap = True
    base.show_linenumbers = True
    base.settings = MagicMock()
    base.settings.config = base.config
    base.settings.theme = base.theme
    base.settings.font = MagicMock()
    base.settings.font.measure = lambda x: 7 * x
    base.settings.uifont = MagicMock()
    base.settings.resources = MagicMock()
    base.settings.bindings = MagicMock()
    return base


@pytest.fixture(scope="class")
def app_instance():
    from biscuit.app import App

    appdir = tempfile.mkdtemp()
    app = App(appdir=appdir)
    app.appdir = appdir
    yield app
    try:
        app.destroy()
    except Exception:
        pass
