import tkinter as tk

from .frame import DiffViewerPane


class DiffViewerContent(tk.PanedWindow):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.path = path
        
        self.editable = False

        self.lhs_frame = DiffViewerPane(self)
        self.add(self.lhs_frame, sticky=tk.NSEW)

        self.rhs_frame = DiffViewerPane(self)  # count lines for this later
        self.add(self.rhs_frame, sticky=tk.NSEW)
