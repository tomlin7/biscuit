import tkinter as tk
from tkinter.constants import *

from core.components.utils import Bubble, Menubutton, get_codicon

from biscuit.core.components.utils import Bubble, Menubutton, get_codicon

from .menu import ActionbarMenu


class MenuItem(Menubutton):
    def __init__(self, master, icon, text, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.bubble = Bubble(self, text=text)
        self.config(text=get_codicon(icon), relief=tk.FLAT, font=("codicon", 20), 
                    padx=10, pady=10, **self.base.theme.layout.base.sidebar.slots.slot)
        self.pack(fill=tk.X, side=tk.TOP)
        
        self.menu = ActionbarMenu(self, icon)
        self.bind("<Button-1>", self.menu.show)
        self.bind("<Enter>", self.hover)
        self.bind('<Leave>', self.bubble.hide)
    
    def hover(self, *_):
        self.master.switch_menu(self.menu)
        self.bubble.show()
