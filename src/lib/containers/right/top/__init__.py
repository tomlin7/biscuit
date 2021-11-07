import tkinter as tk

from ....components.editortabs import EditorTabs


class RightTopPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.config(orient=tk.HORIZONTAL)

        self.editortabs = EditorTabs(self)
        self.editortabs.configure(height=25)
        self.add(self.editortabs)
