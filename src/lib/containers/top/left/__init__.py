import tkinter as tk


class TopLeftPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.test = tk.Text(self)
        self.test.configure(height=25, width=25)
        self.add(self.test)
