import tkinter as tk

from .components import CommandPalette
from .layout.main import MainFrame
from .utils import Binder

class Root(tk.Tk):
    def __init__(self, base, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = base
        
        self.geometry("850x650")
        self.minsize(800, 600)
        self.title("Biscuit")

        self.primarypane = MainFrame(self)
        self.command_palette = CommandPalette(self)

        self.primarypane.pack(fill=tk.BOTH, expand=True)
        self.binder = Binder(self)

    def run(self):
        self.mainloop()
