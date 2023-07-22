import os

from core.components.utils import Label

from ..terminal import TerminalBase


class Default(TerminalBase):
    """
    Default Terminal - Checks COMSPEC/SHELL environmental variables set in the host machine
    and opens that in terminal. Shows Not Detected in case variable is not set.

    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        # get the correct shell command depending on platform
        self.shell = os.environ.get('COMSPEC') or os.environ.get('SHELL')
        self.name = self.icon = os.path.splitext(os.path.basename(self.shell))[0]
        if not self.shell:
            Label(self, text="No shells detected for the host os, report an issue otherwise.").pack()
            self.name = "Not Detected"
            self.icon = "error"
            return
        
        self.start_service()
