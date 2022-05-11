import os
import tkinter as tk

from .base import Base
from .layout.mainframe import MainFrame
from .components.menubar import MenuBar
from .components.statusbar import StatusBar
from .components.command_palette import CommandPalette


class App(tk.Tk):
    def __init__(self, dir=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.geometry("900x650")
        self.minsize(800, 600)
        self.title("Biscuit")

        self.base = Base(root=self)

        self.primarypane = MainFrame(self)
        self.primarypane.pack(fill=tk.BOTH, expand=True)

        self.command_palette = CommandPalette(self)
        self.base.binder.bind("<Control-P>", self.command_palette.show)

        if dir:
            self.base.set_active_dir(dir)

        self.base.after_initialization()

    def get_popup_x(self, width):
        return self.winfo_rootx() + int(self.winfo_width() / 2) - int(width / 2)

    def get_popup_y(self):
        return self.winfo_rooty()

    def run(self):
        self.mainloop()
