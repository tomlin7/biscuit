import os

from biscuit.common.icons import Icons
from biscuit.common.ui import Label

from ..terminalbase import TerminalBase


class CommandPrompt(TerminalBase):
    """
    Command Prompt - Checks for Command Prompt executable in path and opens that in terminal.
    Shows Not Available in case variable is not set.
    """

    shell = "C:\\windows\\system32\\cmd.exe"
    name = "Default"
    icon = Icons.TERMINAL_CMD

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)

        if not self.shell:
            Label(
                self, text="Command Prompt not available, report an issue otherwise."
            ).grid()
            self.name = "Not Available"
            self.icon = "error"
            return

        self.start_service()
