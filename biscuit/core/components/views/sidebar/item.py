import tkinter as tk
from tkinter.constants import *

from .itembar import ItemBar


class SidebarViewItem(tk.Frame):
    def __init__(self, master, itembar=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(bg='#f8f8f8')

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        self.enabled = True
        self.itembar_enabled = itembar

        if itembar:
            self.itembar = ItemBar(self, self.title, self.__buttons__)
            self.itembar.grid(row=0, column=0, sticky=NSEW)

        self.content = tk.Frame(self, bg='#f8f8f8')
        self.content.base = self.base
        self.content.grid_rowconfigure(0, weight=1)
        self.content.grid_columnconfigure(0, weight=1)
        self.content.grid(row=1 if itembar else 0, column=0, sticky=NSEW)
    
    def set_title(self, title):
        if self.itembar_enabled:
            self.itembar.set_title(title)

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
