import tkinter as tk

from .. import SidebarView


class Search(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = [('ellipsis', lambda e: None)]
        super().__init__(self, master, *args, **kwargs)

        self.master = master
        self.base = master.base

        tk.Label(self, text="Search").pack()
