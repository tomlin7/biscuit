import os

from biscuit.core.components.utils import Label

from ..terminal import Terminal


class CommandPrompt(Terminal):
    """
    Command Prompt - Checks for Command Prompt executable in path and opens that in terminal. 
    Shows Not Available in case variable is not set.

    """
    shell = "cmd"
    name = "Command Prompt"
    icon = "cmd"
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)

        if not self.shell:
            Label(self, text="Command Prompt not available, report an issue otherwise.").grid()
            self.name = "Not Available"
            self.icon = "error"
            return
        
        self.start_service()
