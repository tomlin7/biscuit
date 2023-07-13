import tkinter as tk
from tkinter.constants import *

from .menubar import Menubar
from .base import BaseFrame
from .statusbar import Statusbar
from core.components.utils import Frame


class Root(Frame):
    """
    Root frame holds Menubar, BaseFrame, and Statusbar
    .
    App
    └── Root
        ├── Menubar
        ├── BaseFrame
        └── StatusBar
    """
    def __init__(self, base, *args, **kwargs):
        super().__init__(base, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.menubar = Menubar(self)
        self.baseframe = BaseFrame(self)
        self.statusbar = Statusbar(self)

        self.menubar.pack(fill=BOTH)
        self.baseframe.pack(fill=BOTH, expand=1, pady=(1,0))
        self.statusbar.pack(fill=X, pady=(1,0))
