import os
from ..terminal import TerminalBase

from core.components.utils import Label


class Default(TerminalBase):
    """
    Default Terminal - Checks COMSPEC/SHELL environmental variables set in the host machine
    and opens that in terminal. Shows Not Detected in case variable is not set.

    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        # get the correct shell command depending on platform
        self.shell = os.environ.get('COMSPEC') or os.environ.get('SHELL')
        self.__title__ = os.path.splitext(os.path.basename(self.shell))[0]
        if not self.shell:
            Label(self, text="No shells detected for the host os, report an issue otherwise.").pack()
            self.__title__ = "Not Detected"
            return
        
        self.start_service()
