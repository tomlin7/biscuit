import tkinter as tk

from .codicon import get_codicon

class IconButton(tk.Menubutton):
    """
    Button with only an icon
    """
    def __init__(self, master, icon, event=None, iconsize=11, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.event = event or (lambda _: None)
        self.config(text=get_codicon(icon), font=("codicon", iconsize), width=2)

        self.bind("<Button-1>", self.event)
