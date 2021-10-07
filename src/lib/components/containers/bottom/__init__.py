import tkinter as tk

from vendor.tkterminal import Terminal


class BottomPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        self.t = Terminal(self, pady=5, padx=5, font=("Consolas", 15))
        self.t.shell = True
        self.add(self.t)