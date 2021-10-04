import tkinter as tk

from lib.base import Base

class Root(tk.Tk):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.base = Base(self)

    def run(self):
        self.mainloop()