import tkinter as tk

from .....components.editortabs import EditorTabsPane


class RightTopPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(orient=tk.HORIZONTAL, bd=0, relief=tk.FLAT)

        self.editortabs = EditorTabsPane(self)
        self.editortabs.configure(height=25)
        self.add(self.editortabs)
