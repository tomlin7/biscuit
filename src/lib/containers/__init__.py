import tkinter as tk

from .top import TopPane
from .bottom import BottomPane


class BasePane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.configure(orient=tk.VERTICAL)

        self.top = TopPane(self, height=520)
        self.bottom = BottomPane(self, height=280)
        
        self.add(self.top)
        self.add(self.bottom)
