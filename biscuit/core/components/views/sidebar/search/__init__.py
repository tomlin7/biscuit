import tkinter as tk

from ..sidebarview import SidebarView


class Search(SidebarView):
    def __init__(self, master, *args, **kwargs):
        self.__buttons__ = (('ellipsis',),)
        super().__init__(master, *args, **kwargs)

        tk.Label(self, text="Search").pack()
