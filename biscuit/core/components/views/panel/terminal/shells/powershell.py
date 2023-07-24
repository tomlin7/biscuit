import os

from biscuit.core.components.utils import Label

from ..terminal import Terminal


class PowerShell(Terminal):
    """
    PowerShell - Checks for powershell executable in path and opens that in terminal. 
    Shows Not Available in case variable is not set.

    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        self.shell = "powershell"
        self.name = "PowerShell"
        self.icon = "terminal-powershell"
        if not self.shell:
            Label(self, text="PowerShell not available, report an issue otherwise.").pack()
            self.name = "Not Available"
            self.icon = "error"
            return
        
        self.start_service()
