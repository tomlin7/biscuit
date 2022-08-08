import tkinter as tk

from ...utils import Scrollbar
from .linenumbers import LineNumbers
from .text import Text


class TextEditor(tk.Frame):
    def __init__(self, master, path=None, exists=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.path = path
        self.exists = exists
        self.editable = True

        self.font = self.base.settings.font
        
        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)

        self.text = Text(master=self, path=self.path, exists=self.exists)
        self.linenumbers = LineNumbers(master=self, text=self.text)
        self.scrollbar = Scrollbar(self, orient=tk.VERTICAL, command=self.text.yview)
        
        self.text.config(font=self.font)
        self.text.configure(yscrollcommand=self.scrollbar.set)

        self.linenumbers.grid(row=0, column=0, sticky=tk.NS)
        self.text.grid(row=0, column=1, sticky=tk.NSEW)
        self.scrollbar.grid(row=0, column=2, sticky=tk.NS)

        if self.exists:
            self.text.load_file()

        self.text.bind("<<Change>>", self.on_change)
        self.text.bind("<Configure>", self.on_change)

    def unsupported_file(self):
        self.text.show_unsupported_dialog()
        self.linenumbers.grid_remove()
        self.scrollbar.grid_remove()
        self.editable = False
        self.base.root.statusbar.configure_editmode(False)

    def on_change(self, event=None):
        self.linenumbers.redraw()
        self.base.update_statusbar_ln_col_info()
    
    def set_fontsize(self, size):
        self.font.configure(size=size)
        self.linenumbers.set_bar_width(size * 3)
        self.on_change()

    def refresh_fontsize(self):
        self.set_fontsize(self.zoom)
        self.on_change()
    
    def cut(self, *_):
        if self.editable:
            self.text.cut()
    
    def copy(self, *_):
        if self.editable:
            self.text.copy()
        
    def paste(self, *_):
        if self.editable:
            self.text.paste()
