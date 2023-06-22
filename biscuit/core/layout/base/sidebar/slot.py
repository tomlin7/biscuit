import tkinter as tk
from tkinter.constants import *

from ....components.utils import get_codicon


class Slot(tk.Menubutton):
    def __init__(self, master, view, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base 

        self.view = view
        self.enabled = False

        self.bubble = tk.Toplevel(self, bg='#dddbdd')
        self.bubble.overrideredirect(True)
        tk.Label(self.bubble, text=view.__icon__, bg="#f8f8f8", padx=5, pady=5).pack(padx=1, pady=1)
        self.bubble.withdraw()

        self.bind('<Enter>', self.show_bubble)
        self.bind('<Leave>', lambda *_: self.bubble.withdraw())
        
        self.config(text=get_codicon(view.__icon__), relief=tk.FLAT, font=("codicon", 18), padx=10, pady=10,
            bg="#f8f8f8", fg="#626262", activebackground="#f8f8f8", activeforeground="black")
        self.pack(fill=tk.X, side=tk.TOP)
        
        self.bind('<Button-1>', self.toggle)
    
    def show_bubble(self, *_):
        self.bubble.update_idletasks()
        self.bubble.geometry(f"+{self.winfo_rootx() + self.winfo_width() + 5}" +
                             f"+{int(self.winfo_rooty() + (self.winfo_height() - self.bubble.winfo_height())/2)}")
        self.bubble.deiconify()
        
    def toggle(self, *_):
        if not self.enabled:
            self.master.set_active_slot(self)
            self.enable()
        else:
            self.disable()
        
    def enable(self):
        if not self.enabled:
            self.view.grid(column=1, row=0, sticky=NSEW, padx=(0, 1))
            self.config(fg="black")
            self.enabled = True

    def disable(self):
        if self.enabled:
            self.view.grid_remove()
            self.config(fg="#626262")
            self.enabled = False
