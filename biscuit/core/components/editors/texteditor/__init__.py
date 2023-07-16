import tkinter as tk

from ...utils import Scrollbar
from ..editor import BaseEditor

from .minimap import Minimap
from .linenumbers import LineNumbers
from .text import Text


class TextEditor(BaseEditor):
    def __init__(self, master, path=None, exists=True, minimalist=False, *args, **kwargs):
        super().__init__(master, path, exists, *args, **kwargs)
        self.font = self.base.settings.font
        self.minimalist = minimalist
        
        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)

        self.text = Text(self, path=self.path, exists=self.exists, minimalist=minimalist)
        self.linenumbers = LineNumbers(self, text=self.text)
        self.scrollbar = Scrollbar(self, orient=tk.VERTICAL, command=self.text.yview)
        
        self.text.config(font=self.font)
        self.text.configure(yscrollcommand=self.scrollbar.set)
        
        if not self.minimalist:
            self.minimap = Minimap(self, self.text)
            self.minimap.grid(row=0, column=2, sticky=tk.NS)
        
        self.linenumbers.grid(row=0, column=0, sticky=tk.NS)
        self.text.grid(row=0, column=1, sticky=tk.NSEW)
        self.scrollbar.grid(row=0, column=3, sticky=tk.NS)

        self.text.bind("<<Change>>", self.on_change)
        self.text.bind("<<Scroll>>", self.on_scroll)

    def on_change(self, *_):
        self.text.refresh()
        self.linenumbers.redraw()
        self.base.update_statusbar()

    def on_scroll(self, *_):
        self.linenumbers.redraw()
        if not self.minimalist:
            self.minimap.redraw()

    def unsupported_file(self):
        self.text.highlighter.lexer = None
        self.text.show_unsupported_dialog()
        self.linenumbers.grid_remove()
        self.scrollbar.grid_remove()
        self.editable = False

    def focus(self):
        self.text.focus()
        self.on_change()

    def set_fontsize(self, size):
        self.font.configure(size=size)
        self.linenumbers.set_bar_width(size * 3)
        self.on_change()
    
    def save(self, path=None):
        if self.editable:
            self.text.save_file(path)
    
    def cut(self, *_):
        if self.editable:
            self.text.cut()
    
    def copy(self, *_):
        if self.editable:
            self.text.copy()
        
    def paste(self, *_):
        if self.editable:
            self.text.paste()
