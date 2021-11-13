import tkinter as tk
from tkinter import ttk

from .frame import DiffViewerPane


class DiffViewerContent(ttk.PanedWindow):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, orient=tk.HORIZONTAL, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.path = path
        
        self.editable = True

        self.lhs_frame = DiffViewerPane(self, path)
        self.add(self.lhs_frame, weight=1)
        self.lhs_frame.load_file()

        self.rhs_frame = DiffViewerPane(self, path)  # count lines for this later
        self.add(self.rhs_frame, weight=1)
        self.rhs_frame.load_file()

        self.text = self.lhs_frame.content.text

        self.lhs_frame.content.scrollbar['command'] = self.on_scrollbar
        self.rhs_frame.content.scrollbar['command'] = self.on_scrollbar
        self.lhs_frame.content.text['yscrollcommand'] = self.on_textscroll
        self.rhs_frame.content.text['yscrollcommand'] = self.on_textscroll

    def on_scrollbar(self, *args):
        self.lhs_frame.content.text.yview(*args)
        self.rhs_frame.content.text.yview(*args)

    def on_textscroll(self, *args):
        self.lhs_frame.content.scrollbar.set(*args)
        self.rhs_frame.content.scrollbar.set(*args)
        self.on_scrollbar('moveto', args[0])
