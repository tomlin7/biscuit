import tkinter as tk

from ..containers.base import BasePane
from ..components.sidebar import Sidebar


class PrimaryPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(orient=tk.HORIZONTAL)
        
        self.basepane = BasePane(master=self) #, sashpad=5) #, opaqueresize=False)
        self.add(self.basepane, sticky=tk.NSEW)

        self.sidebar = Sidebar(self, self.basepane.left_panes)
        self.add(self.sidebar, sticky=tk.NS, before=self.basepane)
