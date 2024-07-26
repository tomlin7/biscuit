import tkinter as tk

from git import Optional
from hintedtext import HintedEntry

from .icons import IconButton
from .native import Frame


class ButtonsEntry(Frame):
    """Entry containing icon buttons on the right

    Args:
        master: Parent widget
        hint: Entry hint
        buttons: List of tuples containing button icon, event and optional second icon (toggled)
        textvariable: Entry text variable
    """

    def __init__(
        self,
        master,
        hint: str,
        buttons: list[tuple[str, callable, Optional[str]]] = [],
        textvariable=None,
        *args,
        **kwargs
    ):
        """Create a new ButtonsEntry

        Args:
            master: Parent widget
            hint: Entry hint
            buttons: List of tuples containing button icon, event and optional second icon (toggled)
            textvariable: Entry text variable"""

        super().__init__(master, *args, **kwargs)
        self.config(padx=1, pady=1, bg=self.base.theme.border)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.entry = HintedEntry(
            self,
            relief=tk.FLAT,
            font=self.base.settings.uifont,
            bd=5,
            hint=hint,
            **self.base.theme.utils.buttonsentry,
            textvariable=textvariable
        )
        self.entry.grid(row=0, column=0, sticky=tk.NSEW)

        self.column = 1
        self.add_buttons(buttons)

    def add_button(self, icon: str, event=lambda _: None, icon2: str = None):
        """Add a button to the entry"""

        b = IconButton(self, icon, event, icon2)
        b.grid(row=0, column=self.column, sticky="")
        b.config(**self.base.theme.utils.buttonsentry.button)
        self.column += 1

    def add_buttons(self, buttons):
        """Add multiple buttons to the entry"""

        for btn in buttons:
            self.add_button(*btn)

    def get(self, *args):
        """Get the entry text"""

        return self.entry.get(*args)

    def clear(self):
        """Clear the entry text"""

        return self.entry.delete(0, tk.END)

    def delete(self, *args):
        """Delete the entry text"""

        return self.entry.delete(*args)

    def insert(self, *args):
        """Insert text into the entry"""

        return self.entry.insert(*args)
