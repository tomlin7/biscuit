import tkinter as tk

from .native import Frame


class KeyB(Frame):
    """Visual representation of a key binding.

    Args:
        master (tk.Widget): The parent widget.
        key (str): The key to be displayed."""

    def __init__(self, master, key: str, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.key = key
        self.config(bg=self.base.theme.border)

        frame = Frame(self, bg=self.base.theme.editors.background)
        frame.pack(pady=1, padx=1)

        self.label = tk.Label(
            frame,
            text=key,
            bg=self.base.theme.border,  # self.base.theme.editors.background,
            fg=self.base.theme.editors.foreground,  # self.base.theme.border,
            font=("Consolas", 8),
        )
        self.label.pack(pady=(1, 3), padx=1, side=tk.LEFT)


class Shortcut(Frame):
    """Visual representation of a shortcut key combination.

    Args:
        master (tk.Widget): The parent widget.
        shortcuts (tuple[str]): Tuple of shortcuts to be displayed."""

    def __init__(self, master, keys: tuple[str], *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self._keys = keys

        self.labels = []
        self.bg, self.fg, _, _ = self.base.theme.editors.values()
        self.render()

    def render(self) -> None:
        """Render the widget."""

        for key in self._keys[:-1]:
            self.add_key(key)
            self.add_separator()
        self.add_key(self._keys[-1])

    def add_separator(self) -> None:
        """Add a '+' separator between shortcuts."""

        l = tk.Label(
            self, text="+", bg=self.bg, fg=self.base.theme.border, font=("Consolas", 7)
        )
        l.pack(padx=2, side=tk.LEFT)
        self.labels.append(l)

    def add_key(self, key: str) -> None:
        """Add a shortcut to the widget."""

        l = KeyB(self, key)
        l.pack(padx=2, side=tk.LEFT)
        self.labels.append(l)
