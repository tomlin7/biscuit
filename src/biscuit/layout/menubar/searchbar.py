import tkinter as tk

from src import __version__
from src.biscuit.common.ui import Frame, IconButton, IconLabelButton


class SearchBar(Frame):
    """Search bar for the menu bar.

    - When no active directory, opens the command palette, shows the biscuit version
    - When active directory, opens the file search, shows the active directory name"""

    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.label = IconLabelButton(
            self,
            text=f"Biscuit {__version__}",
            icon="search",
            padx=150,
            callback=self.onclick,
        )
        self.label.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, pady=1, padx=1)

        self.palette_button = IconButton(
            self, icon="terminal", event=self.base.commands.show_command_palette
        )
        self.palette_button.config(**self.base.theme.utils.iconlabelbutton)
        self.palette_button.pack(
            side=tk.RIGHT, fill=tk.BOTH, expand=True, pady=1, padx=(0, 1)
        )

    def onclick(self, *_):
        if self.base.active_directory:
            self.base.commands.search_files()
        else:
            self.base.commands.show_command_palette()
