import tkinter as tk
from tkinter.constants import *

from .menu import ActionbarMenu
from core.components.utils import get_codicon, Bubble


class MenuItem(tk.Menubutton):
    def __init__(self, menubar, icon, text, *args, **kwargs):
        super().__init__(menubar, *args, **kwargs)
        self.menubar = menubar
        self.base = menubar.base 

        self.bubble = Bubble(self, text=text)
        self.config(text=get_codicon(icon), relief=tk.FLAT, font=("codicon", 18), padx=10, pady=10,
            bg="#f8f8f8", fg="#626262", activebackground="#f8f8f8", activeforeground="black")
        self.pack(fill=tk.X, side=tk.TOP)
        
        self.menu = ActionbarMenu(self, icon)
        self.bind("<Button-1>", self.menu.show)
        self.bind("<Enter>", self.hover)
        self.bind('<Leave>', self.bubble.hide)
    
    def hover(self, *_):
        self.menubar.switch_menu(self.menu)
        self.bubble.show()
