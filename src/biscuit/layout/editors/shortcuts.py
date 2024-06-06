import tkinter as tk

from src.biscuit.common.ui import Frame, Shortcut


class Shortcuts(Frame):
    """Visual representation of the shortcuts"""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.row = 0

    def add_shortcut(self, name: str, value: tuple[str]) -> None:
        name = tk.Label(
            self,
            text=name,
            font=("Segoi UI", 10),
            anchor=tk.E,
            **self.base.theme.editors.labels
        )
        shortcut = Shortcut(self, shortcuts=value, **self.base.theme.editors)

        name.grid(row=self.row, column=0, sticky=tk.EW, pady=5, padx=5)
        shortcut.grid(row=self.row, column=1, sticky=tk.EW, pady=5, padx=5)

        self.row += 1
