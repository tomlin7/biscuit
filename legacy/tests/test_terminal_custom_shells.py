from unittest.mock import MagicMock
import pytest

from biscuit.views.terminal.shells import create_custom_shell_class, CustomShell
from biscuit.views.terminal.terminal import Terminal


class TestCustomShells:
    def test_create_custom_shell_class(self):
        cls = create_custom_shell_class("NuShell", "/usr/bin/nu")
        assert cls.name == "NuShell"
        assert cls.shell == "/usr/bin/nu"
        assert issubclass(cls, CustomShell)

    def test_refresh_shells_menu_loads_configured_shells(self):
        term = Terminal.__new__(Terminal)
        term.base = MagicMock()
        term.base.config.get_nested.return_value = {
            "Zsh": "/bin/zsh",
            "Fish": "/usr/bin/fish"
        }
        term.addmenu = MagicMock()
        term.open_shell = MagicMock()

        term.refresh_shells_menu()

        term.addmenu.clear.assert_called_once()
        added_commands = [call.args[0] for call in term.addmenu.add_command.call_args_list]
        assert "Zsh" in added_commands
        assert "Fish" in added_commands

    def test_open_custom_shell(self):
        term = Terminal.__new__(Terminal)
        term.base = MagicMock()
        term.open_shell = MagicMock()

        term.open_custom_shell("/bin/zsh", "Zsh")
        term.open_shell.assert_called_once()
        shell_cls = term.open_shell.call_args[0][0]
        assert shell_cls.name == "Zsh"
        assert shell_cls.shell == "/bin/zsh"
