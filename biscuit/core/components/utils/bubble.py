import tkinter as tk

from .label import Label
from .toplevel import Toplevel


class Bubble(Toplevel):
    """
     +===============+
    ||      Text     ||
     +===============+
    """
    def __init__(self, master, text, bd=1, *args, **kw) -> None:
        super().__init__(master, *args, **kw)
        self.overrideredirect(True)
        self.config(bg=self.base.theme.border)
        self.label = Label(self, text=text, padx=5, pady=5, font=("Segoi UI", 10), **self.base.theme.utils.bubble)
        self.label.pack(padx=bd, pady=bd)
        self.withdraw()
    
    def get_pos(self) -> str:
        return (f"+{self.master.winfo_rootx() + self.master.winfo_width() + 5}" + 
                f"+{int(self.master.winfo_rooty() + (self.master.winfo_height() - self.winfo_height())/2)}")

    def change_text(self, text) -> None:
        self.label.config(text=text)

    def show(self, *_) -> None:
        self.update_idletasks()
        self.geometry(self.get_pos())
        self.deiconify()
    
    def hide(self, *_) -> None:
        self.withdraw()
