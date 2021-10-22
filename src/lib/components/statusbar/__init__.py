import tkinter as tk 

from lib.components.statusbar.utils.label import SLabel
from lib.components.statusbar.utils.button import SButton
from lib.components.statusbar.utils.clock import SClock

class StatusBar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.branch = SButton(self, text=" master")
        self.sample = SLabel(self, text="Status Bar")
        
        self.line_col_info = SButton(self, text="Ln ?, Col ?")
        self.encoding = SButton(self, text="UTF-8")
        self.eol = SButton(self, text="CRLF")
        self.file_type = SButton(self, text="Plain Text")
        self.clock = SClock(self, text="H:M:S")
        
        # packing
        self.branch.pack(side=tk.LEFT)
        self.sample.pack(side=tk.LEFT)
        
        self.clock.pack(side=tk.RIGHT)
        self.file_type.pack(side=tk.RIGHT)
        self.eol.pack(side=tk.RIGHT)
        self.encoding.pack(side=tk.RIGHT)
        self.line_col_info.pack(side=tk.RIGHT)

    def set_line_col_info(self, line, col, selected):
        self.line_col_info.config(text="Ln {0}, Col {1}{2}".format(line, col, f" ({selected} selected)" if selected else ""))