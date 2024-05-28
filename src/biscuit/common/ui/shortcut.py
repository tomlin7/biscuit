import tkinter as tk

from .native import Frame


class Shortcut(Frame):
    """Visual representation of a shortcut key combination.
    
    Args:
        master (tk.Widget): The parent widget.
        shortcuts (tuple[str]): Tuple of shortcuts to be displayed."""

    def __init__(self, master, shortcuts: tuple[str], *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.shortcuts = shortcuts
        self.add_shortcuts()

    def add_shortcuts(self) -> None:
        """Add all shortcuts to the widget."""

        for shortcut in self.shortcuts[:-1]:
            self.add_shortcut(shortcut)
            self.add_separator()
        self.add_shortcut(self.shortcuts[-1])

    def add_separator(self) -> None:
        """Add a '+' separator between shortcuts."""

        tk.Label(self, text="+", **self.base.theme.editors.labels).pack(padx=2, side=tk.LEFT)

    def add_shortcut(self, shortcut: str) -> None:
        """Add a shortcut to the widget."""
        
        tk.Label(
            self, text=shortcut, bg=self.base.theme.border, fg=self.base.theme.biscuit_dark, 
            font=("Consolas", 10)).pack(padx=2, side=tk.LEFT)
