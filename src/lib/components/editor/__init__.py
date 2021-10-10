import tkinter as tk

from lib.components.text import Text
from lib.components.editor.utils.linenumbers import LineNumbers
from lib.components.editor.utils.binder import Binder

class Editor(tk.Frame):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.text = Text(master=self, path=path)
        self.linenumbers = LineNumbers(master=self, text=self.text)

        self.scrollbar = tk.Scrollbar(self, orient="vertical", command=self.text.yview)
        self.text.configure(yscrollcommand=self.scrollbar.set)

        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.linenumbers.pack(side=tk.LEFT, fill=tk.Y)
        self.text.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        self.text.bind("<<Change>>", self._on_change)
        self.text.bind("<Configure>", self._on_change)
        
        # self.binder = Binder(bindings=self.base.settings.bindings, editor=self)

    def _on_change(self, event):
        self.linenumbers.redraw()
