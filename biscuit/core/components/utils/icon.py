import tkinter as tk

from .codicon import get_codicon
from .label import Label


class Icon(Label):
    """Button with only an icon"""
    def __init__(self, master, icon: str="", iconsize: int=14, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(font=("codicon", iconsize))
        self.set_icon(icon)

    def set_icon(self, icon: str) -> None:
        self.config(text=get_codicon(icon))
