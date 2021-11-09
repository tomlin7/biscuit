import tkinter as tk

from ..containers.base import BasePane
from ..components.sidebar import Sidebar


class PrimaryPane(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(bd=0, relief=tk.FLAT)

        self.basepane = BasePane(master=self) #, sashpad=5) #, opaqueresize=False)
        self.basepane.pack(fill=tk.BOTH, expand=1, side=tk.RIGHT)

        self.sidebar = Sidebar(self, self.basepane.left_panes)
        self.sidebar.pack(side=tk.RIGHT, fill=tk.Y)
