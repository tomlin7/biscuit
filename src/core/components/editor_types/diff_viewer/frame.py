import tkinter as tk

from ..editor import TextEditor


class DiffViewerFrame(tk.Frame):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.path = path

        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        self.content = TextEditor(self, path, exists=False)
        self.content.grid(row=0, column=0, sticky=tk.NSEW)

    def load_file(self):
        self.content.text.load_file()
    
    def load_text(self, text):
        self.content.text.clear_insert(text)