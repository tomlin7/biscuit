import tkinter as tk

from .left import LeftPane
from .right import RightPane
from ..components.sidebar import Sidebar

class BasePane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.configure(orient=tk.HORIZONTAL)

        self.sidebar = Sidebar(self)
        self.left = LeftPane(self) #, opaqueresize=False)
        self.right = RightPane(self) #, opaqueresize=False)
        
        self.add(self.sidebar)
        self.add(self.left)
        self.add(self.right)
