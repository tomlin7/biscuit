import os
import tkinter as tk
from tkinterDnD import Tk

from .base import Base
from .containers import BasePane
from .components.statusbar import StatusBar

from .components.popup import PopupMenu

class Root(Tk):
    def __init__(self, path, dir=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.appdir = os.path.dirname(path)

        self.minsize(1290, 800)
        self.title("Biscuit")

        self.base = Base(root=self)

        # temp, move to a class, command palette
        menus = [("Test 1", lambda e=None: print("Test 1")), ("Test 2", lambda e=None: print("Test 2")),
                ("Test 3", lambda e=None: print("Test 3")), ("Test 4", lambda e=None: print("Test 4"))]

        self.popup = PopupMenu(
            self, menus, prompt=">", 
            watermark="Search Something Here", bg="#f3f3f3")
        self.bind("<Control-n>", self.popup.show)

        self.basepane = BasePane(master=self) #, sashpad=5) #, opaqueresize=False)
        self.basepane.pack(fill=tk.BOTH, expand=1)

        self.statusbar = StatusBar(master=self)
        self.statusbar.pack(side=tk.BOTTOM, fill=tk.X)

        if dir:
            self.base.set_active_dir(dir)
        
        self.base.after_initialization()

    def get_popup_x(self, width):
        return self.winfo_rootx() + int(self.winfo_width() / 2) - int(width / 2)

    def get_popup_y(self):
        return self.winfo_rooty()

    def run(self):
        self.mainloop()