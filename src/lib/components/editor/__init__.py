import tkinter as tk
import tkinter.font as Font

from ..text import Text
from ..text.utils import Utils

from .content import EditorContent
from .utils.path import Path

class Editor(tk.Frame):
    def __init__(self, master, path=None, exists=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.path = path
        self.exists = exists

        self.pathbar = Path(master=self, text=path)
        self.content = EditorContent(self, path=path, exists=exists)

        self.rowconfigure(1, weight=1)

        self.pathbar.grid(row=0, column=0, sticky=tk.EW)
        self.content.grid(row=1, column=0, sticky=tk.NSEW)
