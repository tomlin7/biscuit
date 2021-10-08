from tkinter import ttk


class EditorTabs(ttk.Notebook):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
