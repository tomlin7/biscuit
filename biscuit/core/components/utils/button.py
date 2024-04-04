import tkinter as tk

from .menubutton import Menubutton


class Button(Menubutton):
    """A flat style button"""

    def __init__(self, master, text, command=lambda _: None, *args, **kwargs) -> None:
        super().__init__(master, text=text, *args, **kwargs)
        self.config(pady=5, font=("Segoi UI", 10), cursor="hand2", **self.base.theme.utils.button)
        self.set_command(command)

    def set_command(self, command) -> None:
        """Set the command for the button"""

        self.bind('<Button-1>', command)
