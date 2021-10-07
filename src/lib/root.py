import tkinter as tk

from lib.base import Base
from lib.components.containers import BasePane


class Root(tk.Tk):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self.minsize(1290, 800)

        self.basepane = BasePane(master=self)
        self.basepane.pack(fill=tk.BOTH, expand=1)

        self.base = Base(root=self)

    def run(self):
        self.mainloop()