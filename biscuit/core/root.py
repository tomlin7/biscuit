import tkinter as tk

from .layout.mainframe import MainFrame
from .components.command_palette import CommandPalette


class Root(tk.Tk):
    def __init__(self, base, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base = base
        
        self.geometry("850x650")
        self.minsize(800, 600)
        self.title("Biscuit")

    def add_components(self):

        self.primarypane = MainFrame(self)
        self.primarypane.pack(fill=tk.BOTH, expand=True)

        self.command_palette = CommandPalette(self)
        # self.base.binder.bind("<Control-P>", self.command_palette.show)
        
    def get_popup_x(self, width):
        return self.winfo_rootx() + int(self.winfo_width() / 2) - int(width / 2)

    def get_popup_y(self):
        return self.winfo_rooty()

    def run(self):
        self.mainloop()
