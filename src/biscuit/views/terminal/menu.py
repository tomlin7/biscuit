import tkinter as tk

from src.biscuit.common import Menu


class TerminalMenu(Menu):
    def get_coords(self, e: tk.Event):
        return (
            e.widget.winfo_rootx() + e.widget.winfo_width() - self.winfo_width(),
            e.widget.winfo_rooty() + e.widget.winfo_height(),
        )
