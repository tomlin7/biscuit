import tkinter as tk
from tkinterDnD import Tk

from lib.base import Base
from lib.containers import BasePane


class Root(Tk):
    def __init__(self, dir=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self.minsize(1290, 800)
        self.title("Biscuit")

        self.base = Base(root=self)

        self.basepane = BasePane(master=self)
        self.basepane.pack(fill=tk.BOTH, expand=1)

        if dir:
            self.base.set_active_dir(dir)

    def run(self):
        self.mainloop()