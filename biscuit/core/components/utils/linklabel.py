import tkinter as tk

from .label import Label


class LinkLabel(Label):
    """Label that acts as a link"""

    def __init__(self, master, text, command=lambda _: None, *args, **kwargs) -> None:
        super().__init__(master, text=text, *args, **kwargs)
        self.config(font=("Segoi UI", 10), cursor="hand2", **self.base.theme.utils.linklabel)
        self.set_command(command)

    def set_command(self, command) -> None:
        self.bind('<Button-1>', command)
