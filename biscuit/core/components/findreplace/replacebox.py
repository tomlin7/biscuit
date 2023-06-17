import tkinter as tk

from ..utils import EntryBox, IconButton


class ReplaceBox(EntryBox):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master

        self.btn_frame = tk.Frame(self, bg="#3c3c3c")
        self.btn_frame.grid(row=0, column=1, sticky=tk.NSEW)
        
        self.keep_case = IconButton(self.btn_frame, "preserve-case")
        
        self.keep_case.grid(row=0, column=0, sticky=tk.NSEW, pady=2, padx=(3, 1))
