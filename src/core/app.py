<<<<<<<< HEAD:biscuit/core/root.py
import tkinter as tk

from .layout import PrimaryPane
========
import os
import tkinter as tk

from .base import Base
from .layout.mainframe import MainFrame
>>>>>>>> 0dae86dcbe04f283f59b954af87d034397c94412:src/core/app.py
from .components.menubar import MenuBar
from .components.statusbar import StatusBar
from .components.command_palette import CommandPalette


<<<<<<<< HEAD:biscuit/core/root.py
class Root(tk.Tk):
    def __init__(self, base, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = base
        
        self.geometry("850x650")
        self.minsize(800, 600)
        self.title("Biscuit")

    def add_components(self):
        self.menubar = MenuBar(self)
        self.menubar.pack(fill=tk.X)

        self.primarypane = PrimaryPane(self)
========
class App(tk.Tk):
    def __init__(self, dir=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.geometry("900x650")
        self.minsize(800, 600)
        self.title("Biscuit")

        self.base = Base(root=self)

        self.primarypane = MainFrame(self)
>>>>>>>> 0dae86dcbe04f283f59b954af87d034397c94412:src/core/app.py
        self.primarypane.pack(fill=tk.BOTH, expand=True)

        self.command_palette = CommandPalette(self)
        # self.base.binder.bind("<Control-P>", self.command_palette.show)

    def get_popup_x(self, width):
        return self.winfo_rootx() + int(self.winfo_width() / 2) - int(width / 2)

    def get_popup_y(self):
        return self.winfo_rooty()

    def run(self):
        self.mainloop()
