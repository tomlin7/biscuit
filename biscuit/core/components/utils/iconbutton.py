import tkinter as tk

from .codicon import get_codicon

class IconButton(tk.Menubutton):
    """
    Button with only an icon
    """
    def __init__(self, master, icon, event=lambda _: None, iconsize=12, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.event = event
        self.config(text=get_codicon(icon), font=("codicon", iconsize))

        self.bind("<Button-1>", self.event)
    
    def set_icon(self, icon):
        self.config(text=get_codicon(icon))
