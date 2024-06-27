import tkinter as tk

from biscuit.common import Menu


class SourceControlMenu(Menu):
    def get_coords(self, e: tk.Event):
        return e.widget.winfo_rootx(), e.widget.winfo_rooty() + e.widget.winfo_height()
