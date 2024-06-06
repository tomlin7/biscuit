import tkinter as tk


class Separator(tk.Label):
    """A separator for the menu"""

    def __init__(self, master, length=20, *args, **kwargs) -> None:
        """Create a separator

        Args:
            master: The parent widget
            length: The length of the separator
        """

        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.config(
            text="—" * round((length * self.base.scale)),
            pady=0,
            height=1,
            **self.base.theme.menu,
            fg=self.base.theme.border
        )
