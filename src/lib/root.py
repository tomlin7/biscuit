import tkinter as tk

from lib.base import Base
from lib.containers import BasePane


class Root(tk.Tk):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self.minsize(1290, 800)

        self.base = Base(root=self)

        self.basepane = BasePane(master=self)
        self.basepane.pack(fill=tk.BOTH, expand=1)

    def run(self):
        self.mainloop()