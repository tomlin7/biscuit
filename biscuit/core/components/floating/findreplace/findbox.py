import tkinter as tk

from core.components.utils import EntryBox, IconButton


class FindBox(EntryBox):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master

        self.btn_frame = tk.Frame(self)
        self.btn_frame.grid(row=0, column=1, sticky=tk.NSEW)
        
        self.full_word = IconButton(self.btn_frame, "whole-word")
        self.regex_button = IconButton(self.btn_frame, "regex")
        
        self.full_word.grid(row=0, column=0, sticky=tk.NSEW, pady=2, padx=(3, 1))
        self.regex_button.grid(row=0, column=2, sticky=tk.NSEW, pady=2, padx=(1, 3))
