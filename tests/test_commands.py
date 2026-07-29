from unittest.mock import MagicMock, patch

import pytest

from biscuit.commands import Commands


class TestCommands:
    @pytest.fixture
    def commands(self, mock_base):
        cmd = Commands.__new__(Commands)
        cmd.base = mock_base
        cmd.count = 1
        cmd.maximized = False
        cmd.minimized = False
        cmd.previous_pos = None
        return cmd

    def test_init(self, mock_base):
        cmd = Commands(mock_base)
        assert cmd.count == 1
        assert cmd.maximized is False
        assert cmd.minimized is False

    def test_new_file(self, commands):
        commands.new_file()
        commands.base.open_editor.assert_called_once()
        args, kwargs = commands.base.open_editor.call_args
        assert "Untitled" in args[0]
        assert kwargs.get("exists") is False

    def test_new_file_counts_up(self, commands):
        commands.new_file()
        commands.new_file()
        assert commands.count == 3

    def test_new_window(self, commands):
        commands.new_window()
        commands.base.open_new_window.assert_called_once()

    def test_open_empty_editor(self, commands):
        commands.open_empty_editor()
        assert commands.count == 2

    def test_toggle_vim_mode(self, commands):
        commands.base.vim_mode = False
        commands.base.editorsmanager.active_editors = []
        commands.toggle_vim_mode()
        assert commands.base.vim_mode is True

    def test_toggle_vim_mode_off(self, commands):
        commands.base.vim_mode = True
        commands.base.editorsmanager.active_editors = []
        commands.toggle_vim_mode()
        assert commands.base.vim_mode is False

    def test_maximize_biscuit_calls_method(self, commands):
        pass

    def test_minimize_biscuit_calls_method(self, commands):
        pass

    def test_toggle_sidebar(self, commands):
        commands.toggle_sidebar()
        commands.base.sidebar.toggle.assert_called_once()

    def test_toggle_secondary_sidebar(self, commands):
        commands.toggle_secondary_sidebar()
        commands.base.secondary_sidebar.toggle.assert_called_once()

    def test_show_command_palette(self, commands):
        commands.show_command_palette()
        commands.base.palette.show.assert_called_once_with(">")

    def test_search_files(self, commands):
        commands.search_files()
        commands.base.palette.show.assert_called_once()

    def test_show_symbol_palette(self, commands):
        commands.show_symbol_palette()
        commands.base.palette.show.assert_called_once_with("@")

    def test_goto_line_column(self, commands):
        commands.goto_line_column()
        commands.base.palette.show.assert_called_once_with(":")

    def test_show_recent_files(self, commands):
        commands.show_recent_files()
        commands.base.palette.show.assert_called_once_with("recentf:")

    def test_show_recent_folders(self, commands):
        commands.show_recent_folders()
        commands.base.palette.show.assert_called_once_with("recentd:")

    def test_show_directory_tree(self, commands):
        commands.show_directory_tree()
        commands.base.sidebar.show_explorer.assert_called_once()

    def test_show_extensions(self, commands):
        commands.show_extensions()
        commands.base.secondary_sidebar.show_extensions.assert_called_once()

    def test_show_search(self, commands):
        commands.show_search()
        commands.base.editorsmanager.add_search.assert_called_once()

    def test_show_debugger(self, commands):
        commands.show_debugger()
        commands.base.sidebar.show_debug.assert_called_once()

    def test_show_source_control(self, commands):
        commands.show_source_control()
        commands.base.secondary_sidebar.show_source_control.assert_called_once()

    def test_show_assistant(self, commands):
        commands.show_assistant()
        commands.base.secondary_sidebar.show_ai.assert_called_once()

    def test_show_logs(self, commands):
        commands.show_logs()
        commands.base.panel.show_logs.assert_called_once()

    def test_undo(self, commands):
        editor = MagicMock()
        editor.content.editable = True
        editor.content.edit_undo = MagicMock()
        commands.base.editorsmanager.active_editor = editor
        commands.undo()
        editor.content.edit_undo.assert_called_once()

    def test_redo(self, commands):
        editor = MagicMock()
        editor.content.editable = True
        editor.content.edit_redo = MagicMock()
        commands.base.editorsmanager.active_editor = editor
        commands.redo()
        editor.content.edit_redo.assert_called_once()

    def test_save_file(self, commands):
        commands.save_file()

    def test_close_editor(self, commands):
        commands.close_editor()
        commands.base.close_active_editor.assert_called_once()

    def test_quit_biscuit(self, commands):
        commands.quit_biscuit()
        commands.base.on_close_app.assert_called_once()

    def test_zoom_in_not_implemented(self, commands):
        assert not hasattr(commands, "zoom_in")

    def test_zoom_out_not_implemented(self, commands):
        assert not hasattr(commands, "zoom_out")

    def test_split_editor(self, commands):
        commands.split_editor()
        commands.base.editorsmanager.split_editor.assert_called_once()

    def test_show_terminal(self, commands):
        commands.show_terminal()
        commands.base.panel.show_terminal.assert_called_once()
