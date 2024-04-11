import tkinter as tk

from core.components.utils import Frame, IconLabelButton

from biscuit import __version__


class Searchbar(Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.label = IconLabelButton(self, text=f'Biscuit {__version__}', icon="search", padx=150, function=self.onclick)
        self.label.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, pady=1, padx=1)

    def onclick(self, *_):
        if self.base.active_directory:
            self.base.commands.show_file_search()
        else:
            self.base.commands.show_command_palette()
