import tkinter as tk
from tkinter.constants import *

from .itembar import ItemBar


class SidebarViewItem(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        self.enabled = True

        self.itembar = ItemBar(self, self.title, self.__buttons__)
        self.itembar.grid(row=0, column=0, sticky=NSEW)

        self.content = tk.Frame(self)
        self.content.base = self.base
        self.content.grid_rowconfigure(0, weight=1)
        self.content.grid_columnconfigure(0, weight=1)
        self.content.grid(row=1, column=0, sticky=NSEW)

    def toggle(self, *_):
        if not self.enabled:
            self.enable()
        else:
            self.disable()
        
    def enable(self):
        if not self.enabled:
            self.content.grid()
            self.enabled = True

    def disable(self):
        if self.enabled:
            self.content.grid_remove()
            self.enabled = False
