import tkinter as tk
import tkinter.font as Font

from .content import EditorContent
from ..breadcrumbs import BreadCrumbs


class TextEditor(tk.Frame):
    def __init__(self, master, path=None, exists=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.path = path
        self.exists = exists
        self.config(bg="#e8e8e8")

        self.breadcrumbs = BreadCrumbs(master=self, path=path.replace(self.base.active_dir or "", ""))
        self.content = EditorContent(self, path=path, exists=exists)

        self.rowconfigure(1, weight=1)
        self.columnconfigure(0, weight=1)

        if self.content.show_path:
            self.breadcrumbs.grid(row=0, column=0, sticky=tk.EW, pady=(0, 1))
        self.content.grid(row=1, column=0, sticky=tk.NSEW)
        
    def configure_breadcrumbs(self, flag):
        if flag:
            self.breadcrumbs.grid()
        else:
            self.breadcrumbs.grid_remove()
    
    def focus(self):
        if self.content.editable:
            self.content.text.focus_set()
