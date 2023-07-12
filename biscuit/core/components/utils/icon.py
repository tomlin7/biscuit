import tkinter as tk

from .codicon import get_codicon
from .label import Label


class Icon(Label):
    """
    Button with only an icon
    """
    def __init__(self, master, icon, iconsize=14, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.icon = icon
        self.config(text=get_codicon(icon), font=("codicon", iconsize))
    
    def set_icon(self, icon):
        self.config(text=get_codicon(icon))
