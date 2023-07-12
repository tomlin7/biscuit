import tkinter as tk

from .codicon import get_codicon

from .menubutton import Menubutton


class IconButton(Menubutton):
    """
    Button with only an icon
    """
    def __init__(self, master, icon, event=lambda *_:..., icon2=None, iconsize=14, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.utils.iconbutton)
        self.icons = [icon, icon2]
        self.icon2 = icon2
        self.switch = False

        self.event = event
        self.config(text=get_codicon(icon), font=("codicon", iconsize))

        self.bind("<Button-1>", self.onclick)
    
    def onclick(self, *_):
        self.event()
        if not self.icon2:
            return
        
        self.switch = not self.switch
        self.config(text=get_codicon(self.icons[self.switch]))
        self.v_onclick()
    
    def v_onclick(self):
        ...
    
    def set_icon(self, icon):
        self.config(text=get_codicon(icon))
