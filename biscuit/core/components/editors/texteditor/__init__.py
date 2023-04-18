from tkinter.constants import *

from ...utils import Scrollbar
from ..editor import BaseEditor
from .linenumbers import LineNumbers
from .text import Text


class TextEditor(BaseEditor):
    def __init__(self, master, path=None, exists=True, *args, **kwargs):
        super().__init__(master, path, exists, *args, **kwargs)
        self.font = self.base.settings.font
        
        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)

        self.text = Text(self, path=self.path, exists=self.exists)
        self.linenumbers = LineNumbers(self, text=self.text)
        self.scrollbar = Scrollbar(self, orient=VERTICAL, command=self.text.yview)
        
        self.text.config(font=self.font)
        self.text.configure(yscrollcommand=self.scrollbar.set)

        self.linenumbers.grid(row=0, column=0, sticky=NS)
        self.text.grid(row=0, column=1, sticky=NSEW)
        self.scrollbar.grid(row=0, column=2, sticky=NS)

        if self.exists:
            self.text.load_file()

        self.text.bind("<<Change>>", self.on_change)
        self.text.bind("<Configure>", self.on_change)

    def unsupported_file(self):
        self.text.show_unsupported_dialog()
        self.linenumbers.grid_remove()
        self.scrollbar.grid_remove()
        self.editable = False

    def on_change(self, event=None):
        self.linenumbers.redraw()
        self.event_generate("<<Change>>")
    
    def set_fontsize(self, size):
        self.font.configure(size=size)
        self.linenumbers.set_bar_width(size * 3)
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
