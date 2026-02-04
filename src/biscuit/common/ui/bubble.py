import tkinter as tk

from biscuit.common.ui.labels import Label
from biscuit.common.ui.native import Toplevel


class Bubble(Toplevel):
    """Hover bubble for showing information/tips on hover.

    Args:
        master: The parent widget.
        text: The text to be displayed in the bubble.
        bd: The border width of the bubble."""

    def __init__(self, master, text, bd=1, *args, **kw) -> None:
        super().__init__(master, *args, **kw)
        self.overrideredirect(True)
        self.config(bg=self.base.theme.border)
        self.label = Label(
            self,
            text=text,
            padx=5,
            pady=5,
            font=self.base.settings.uifont,
            **self.base.theme.utils.bubble,
        )
        self.label.pack(padx=bd, pady=bd)
        self.withdraw()

    def get_pos(self, *_) -> str:
        """Get the position of the bubble.
        To be reconfigured in inherited classes."""

        return (
            f"+{self.master.winfo_rootx() + self.master.winfo_width() + 5}"
            + f"+{int(self.master.winfo_rooty() + (self.master.winfo_height() - self.winfo_height())/2)}"
        )

    def change_text(self, text) -> None:
        """Change the text of the bubble"""

        self.label.config(text=text)

    def show(self, *_) -> None:
        """Show the bubble"""

        self.update_idletasks()
        self.geometry(self.get_pos())
        self.deiconify()

    def hide(self, *_) -> None:
        """Hide the bubble"""

        self.withdraw()
