import tkinter as tk

from .codicon import get_codicon

class IconButton(tk.Menubutton):
    """
    Button with only an icon
    """
    def __init__(self, master, icon, event=lambda _: None, icon2=None, iconsize=12, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.icons = [icon, icon2]
        self.icon2 = icon2
        self.switch = False

        self.event = event
        self.config(text=get_codicon(icon), font=("codicon", iconsize))

        self.bind("<Button-1>", self.onclick)
    
    def onclick(self, _):
        self.event()
        if not self.icon2:
            return
        
        self.switch = not self.switch
        self.config(text=get_codicon(self.icons[self.switch]))
    
    def set_icon(self, icon):
        self.config(text=get_codicon(icon))
