import tkinter as tk

from src.biscuit.common.ui import Menubutton


class Command(Menubutton):
    """A menu item

    Inherits from Menubutton"""

    def __init__(self, master, text, command=lambda *_: ..., *args, **kwargs) -> None:
        """Create a menu item

        Args:
            master: The parent widget
            text: The text to display on the menu item
            command: The command to run when the item is clicked
            *args: Additional arguments to pass to the Menubutton
        """

        super().__init__(master, *args, **kwargs)
        self.command = command

        self.config(
            text=text,
            anchor=tk.W,
            font=("Segoe UI", 10),
            cursor="hand2",
            padx=20,
            pady=2,
            **self.base.theme.menu.item
        )
        self.bind("<Button-1>", self.on_click)

    def on_click(self, *_) -> None:
        self.master.hide()
        self.command()
