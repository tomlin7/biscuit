import tkinter as tk

from biscuit.core.components.utils import Menubutton


class PaletteItem(Menubutton):
    def __init__(self, master, text, command, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.text = text
        self.command  = command
        
        self.config(text=text, anchor=tk.W, font=("Segoe UI", 10),
            padx=30, pady=3, **self.base.theme.palette.item
        )

        self.bind("<Button-1>", self.on_click)

        self.selected = False
        self.hovered = False
    
    def on_click(self, *args):
        self.command()
        self.master.hide()

    def toggle_selection(self):
        if self.selected:
            self.select()
        else:
            self.deselect()

    def select(self):
        self.config(bg=self.base.theme.biscuit_dark, fg='white', 
                    activebackground=self.base.theme.biscuit_dark, activeforeground='white')
        self.selected = True
    
    def deselect(self):
        self.config(**self.base.theme.palette.item)
        self.selected = False