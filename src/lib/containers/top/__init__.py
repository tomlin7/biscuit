import tkinter as tk

from lib.containers.top.left import TopLeftPane
from lib.containers.top.right import TopRightPane


class TopPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.left = TopLeftPane(self, width=290)
        self.right = TopRightPane(self, width=990)

        self.add(self.left)
        self.add(self.right)
