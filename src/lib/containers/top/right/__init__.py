import tkinter as tk

from lib.components.editortabs import EditorTabs

class TopRightPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.editortabs = EditorTabs(self)
        self.editortabs.configure(height=25, width=75)
        self.add(self.editortabs)
