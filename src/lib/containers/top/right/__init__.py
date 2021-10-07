import tkinter as tk

from lib.components.editor import Editor

class TopRightPane(tk.PanedWindow):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.editor = Editor(self)
        self.editor.configure(height=25, width=75)
        self.add(self.editor)
