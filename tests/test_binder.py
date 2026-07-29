from unittest.mock import MagicMock

import pytest

from biscuit.binder import Binder


class TestBinder:
    @pytest.fixture
    def binder(self, mock_base):
        mock_base.settings.bindings = MagicMock()
        mock_base.settings.bindings.new_file = "<Control-n>"
        mock_base.settings.bindings.save = "<Control-s>"
        mock_base.settings.bindings.quit = "<Control-q>"
        mock_base.settings.bindings.new_window = "<Control-N>"
        mock_base.settings.bindings.open_file = "<Control-o>"
        mock_base.settings.bindings.open_dir = "<Control-O>"
        mock_base.settings.bindings.save_as = "<Control-S>"
        mock_base.settings.bindings.close_file = "<Control-w>"
        mock_base.settings.bindings.undo = "<Control-z>"
        mock_base.settings.bindings.redo = "<Control-y>"
        mock_base.settings.bindings.restore_closed_tab = "<Control-T>"
        mock_base.settings.bindings.close_all_tabs = "<Control-W>"
        mock_base.settings.bindings.change_tab = "<Control-Tab>"
        mock_base.settings.bindings.change_tab_back = "<Control-Shift-Tab>"
        mock_base.settings.bindings.split_tab = "<Control-\\>"
        mock_base.settings.bindings.command_palette = "<Control-P>"
        mock_base.settings.bindings.file_search = "<Control-p>"
        mock_base.settings.bindings.symbol_outline = "<Control-j>"
        mock_base.settings.bindings.goto_line = "<Control-g>"
        mock_base.settings.bindings.panel = "<Control-grave>"
        mock_base.settings.bindings.sidebar = "<Control-b>"
        mock_base.settings.bindings.secondary_sidebar = "<Control-B>"
        mock_base.settings.bindings.directory_tree = "<Control-E>"
        mock_base.settings.bindings.extensions = "<Control-X>"
        mock_base.settings.bindings.global_search = "<Control-F>"
        mock_base.settings.bindings.debugger = "<Control-D>"
        mock_base.settings.bindings.git = "<Control-G>"
        mock_base.settings.bindings.assistant = "<Control-A>"
        mock_base.settings.bindings.logs = "<Control-U>"
        mock_base.settings.bindings.open_settings = "<Control-comma>"
        mock_base.settings.bindings.restore_recent_session = "<Control-Alt-r>"
        mock_base.settings.bindings.open_recent_folders = "<Control-r>"
        mock_base.settings.bindings.open_recent_files = "<Control-R>"

        b = Binder.__new__(Binder)
        b.base = mock_base
        b.bindings = mock_base.settings.bindings
        b.events = mock_base.commands
        return b

    def test_init(self, mock_base):
        mock_base.settings.bindings = MagicMock()
        b = Binder(mock_base)
        assert b.base == mock_base
        assert b.bindings == mock_base.settings.bindings

    def test_bind_all_registers_bindings(self, binder):
        binder.bind = MagicMock()
        binder.bind_all()
        assert binder.bind.call_count >= 15

    def test_bind_all_calls_bind(self, binder):
        binder.bind = MagicMock()
        binder.bind_all()
        binder.bind.assert_any_call(binder.bindings.new_file, binder.events.new_file)
        binder.bind.assert_any_call(binder.bindings.save, binder.events.save_file)
        binder.bind.assert_any_call(binder.bindings.quit, binder.events.quit_biscuit)

    def test_late_bind_all(self, binder):
        binder.bind = MagicMock()
        binder.late_bind_all()
        assert binder.bind.call_count >= 15

    def test_bind_delegates_to_base(self, binder):
        binder.bind("<Control-t>", binder.events)
        binder.base.bind.assert_called_once_with("<Control-t>", binder.events)
