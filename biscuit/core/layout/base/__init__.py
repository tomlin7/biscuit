import tkinter as tk
from tkinter.constants import *

from core.components.utils import Frame

from biscuit.core.components.utils import Frame

from .content import ContentPane
from .sidebar import Sidebar


class BaseFrame(Frame):
    """
    Main frame holds Sidebar and ContentPane
    .
    App
    └── Root
        ├── Menubar
        ├── BaseFrame
        │    ├── Sidebar
        │    └── ContentPane 
        └── StatusBar
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.sidebar = Sidebar(self)
        self.contentpane = ContentPane(master=self)

        self.sidebar.pack(side=LEFT, fill=Y)
        self.contentpane.pack(side=LEFT, fill=BOTH, expand=True)
