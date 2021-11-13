import tkinter as tk
from tkinter import ttk

from .frame import DiffViewerPane


class DiffViewerContent(ttk.PanedWindow):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, orient=tk.HORIZONTAL, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.path = path
        
        self.editable = False

        self.lhs_frame = DiffViewerPane(self)
        self.add(self.lhs_frame, weight=1)

        self.rhs_frame = DiffViewerPane(self)  # count lines for this later
        self.add(self.rhs_frame, weight=1)
