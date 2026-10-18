import os
import platform

from biscuit.common.icons import Icons
from ..terminalbase import TerminalBase

from .bash import Bash
from .cmd import CommandPrompt
from .default import Default
from .powershell import PowerShell

SHELLS = [Default, PowerShell]

if platform.system() == "Windows":
    SHELLS.append(CommandPrompt)
elif platform.system() == "Linux":
    SHELLS.append(Bash)


class CustomShell(TerminalBase):
    """Custom user-configured shell instance."""

    icon = Icons.TERMINAL

    def __init__(self, master, shell_path: str, name: str = None, *args, **kwargs) -> None:
        self.shell = shell_path
        self.name = name or os.path.splitext(os.path.basename(shell_path))[0]
        super().__init__(master, *args, **kwargs)
        self.start_service()


def create_custom_shell_class(name: str, path: str):
    """Factory creating a shell class from name and executable path."""
    return type(
        f"CustomShell_{name}",
        (CustomShell,),
        {
            "name": name,
            "shell": path,
            "__init__": lambda self, master, *a, **kw: CustomShell.__init__(
                self, master, path, name=name, *a, **kw
            ),
        },
    )
