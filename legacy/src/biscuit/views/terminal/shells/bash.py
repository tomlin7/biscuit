import os

from biscuit.common.icons import Icons
from biscuit.common.ui import Label

from ..terminalbase import TerminalBase


class Bash(TerminalBase):
    """
    Linux Bash - Checks for bash executable in path and opens that in terminal.
    Shows Not Available in case variable is not set.
    """

    shell = "/bin/bash"
    name = "Bash"
    icon = Icons.TERMINAL_BASH

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)

        if not self.shell:
            Label(self, text="Bash not available, report an issue otherwise.").grid()
            self.name = "Not Available"
            self.icon = "error"
            return

        self.start_service()
