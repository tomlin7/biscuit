from unittest.mock import MagicMock

import pytest

from biscuit.execution import ExecutionManager


class TestExecutionManager:
    @pytest.fixture
    def exec_manager(self, mock_base):
        em = ExecutionManager.__new__(ExecutionManager)
        em.base = mock_base
        em.commands = {"Python": "python"}
        return em

    def test_init_default_commands(self, mock_base):
        em = ExecutionManager(mock_base)
        assert "Python" in em.commands
        assert em.commands["Python"] == "python"

    def test_register_command(self, exec_manager):
        exec_manager.register_command("JavaScript", "node")
        assert exec_manager.commands["JavaScript"] == "node"

    def test_get_command(self, exec_manager):
        editor = MagicMock()
        editor.language = "Python"
        editor.path = "/path/to/file.py"
        cmd = exec_manager.get_command(editor)
        assert cmd == "python /path/to/file.py"

    def test_get_command_unknown_language(self, exec_manager):
        editor = MagicMock()
        editor.language = "UnknownLang"
        cmd = exec_manager.get_command(editor)
        assert cmd is None

    def test_run_command(self, exec_manager):
        editor = MagicMock()
        editor.run_command_value = "python script.py"
        exec_manager.base.terminalmanager = MagicMock()
        exec_manager.base.terminalmanager.active_terminal = MagicMock()
        exec_manager.run_command(editor)
        exec_manager.base.terminalmanager.run_command.assert_called_once_with("python script.py")

    def test_run_command_external(self, exec_manager):
        editor = MagicMock()
        editor.run_command_value = "python script.py"
        exec_manager.base.terminalmanager = MagicMock()
        exec_manager.run_command(editor, external=True)
        exec_manager.base.terminalmanager.run_external_console.assert_called_once()
