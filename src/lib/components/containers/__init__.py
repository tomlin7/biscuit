import tkinter as tk

from lib.components.containers.top import TopPane
from lib.components.containers.bottom import BottomPane


class BasePane(tk.PanedWindow):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self.configure(orient=tk.VERTICAL)

        self.top = TopPane(self, height=520)
        self.bottom = BottomPane(self, height=280)
        
        self.add(self.top)
        self.add(self.bottom)
