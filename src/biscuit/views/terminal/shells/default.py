import os

from biscuit.common.ui import Label

from ..terminalbase import TerminalBase


class Default(TerminalBase):
    """
    Default Terminal - Checks COMSPEC/SHELL environmental variables set in the host machine
    and opens that in terminal. Shows Not Detected in case variable is not set.
    """

    # get the correct shell command depending on platform
    shell = os.environ.get("COMSPEC") or os.environ.get("SHELL")
    name = icon = os.path.splitext(os.path.basename(shell))[0]

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)

        if not self.shell:
            Label(
                self,
                text="No shells detected for the host os, report an issue otherwise.",
            ).grid()
            self.name = "Not Detected"
            self.icon = "error"
            return

        self.start_service()
