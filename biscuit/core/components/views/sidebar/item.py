import tkinter as tk

from .itembar import ItemBar


class ViewItem(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        self.itembar = ItemBar(self, self.title, self.__buttons__)
        self.itembar.grid(row=0, column=0, sticky=tk.NSEW)
