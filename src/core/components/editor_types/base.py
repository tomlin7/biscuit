import tkinter as tk


class EditorBase(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.show_path = False
        self.editable = False
