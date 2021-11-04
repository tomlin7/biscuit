import os
import tkinter as tk
from tkinterDnD import Tk

from lib.base import Base
from lib.containers import BasePane
from lib.components.sidebar import Sidebar
from lib.components.statusbar import StatusBar

from lib.components.popup import PopupMenu

class Root(Tk):
    def __init__(self, path, dir=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.appdir = os.path.dirname(path)

        self.minsize(1290, 800)
        self.title("Biscuit")

        self.base = Base(root=self)

        # temp
        menus = [("Test 1", lambda e=None: print("Test 1")), ("Test 2", lambda e=None: print("Test 2")),
                ("Test 3", lambda e=None: print("Test 3")), ("Test 4", lambda e=None: print("Test 4"))]

        self.popup = PopupMenu(
            self, menus, prompt=">", 
            watermark="Search Something Here", bg="#f3f3f3")
        self.bind("<Control-n>", self.popup.show)

        # self.sidebar = Sidebar(self)
        # self.sidebar.pack(side=tk.LEFT, fill=tk.Y)

        self.basepane = BasePane(master=self)
        self.basepane.pack(fill=tk.BOTH, expand=1)

        self.statusbar = StatusBar(master=self)
        self.statusbar.pack(side=tk.BOTTOM, fill=tk.X)

        if dir:
            self.base.set_active_dir(dir)
        
        self.base.after_initialization()

    def run(self):
        self.mainloop()