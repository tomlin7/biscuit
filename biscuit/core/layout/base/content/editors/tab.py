import tkinter as tk
from core.components.utils import IconButton


#TODO convert to a frame
# add icon, label, closebutton
class Tab(tk.Frame):
    """
    +-------------------+
    | 🤍 FILENAME     X |
    +-------------------+
    """    
    def __init__(self, master, editor, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        self.config(bg='white')

        self.editor = editor
        self.selected = False
        
        self.name = tk.Label(self, text=editor.filename, padx=5, pady=5, font=('Segoe UI', 10), bg='#f8f8f8')
        self.name.pack(side=tk.LEFT)

        self.closebtn = IconButton(self, 'close', event=self.close, activebackground="#e9e9e9")
        self.closebtn.pack(pady=5, padx=5)

        self.bind("<Button-1>", self.select)
        self.name.bind("<Button-1>", self.select)

        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.off_hover)
    
    def close(self, *_):
        self.master.close_tab(self)
    
    def on_hover(self, *_):
        if not self.selected:
            self.name.config(bg="white")
            self.config(bg="white")
            self.closebtn.config(bg="white")
            self.hovered = True

    def off_hover(self, *_):
        if not self.selected:
            self.name.config(bg="#f8f8f8")
            self.config(bg="#f8f8f8")
            self.closebtn.config(bg="#f8f8f8")
            self.hovered = False

    def deselect(self, *_):
        if self.selected:
            self.editor.grid_remove()
            self.name.config(bg='#f8f8f8')
            self.config(bg="#f8f8f8")
            self.closebtn.config(bg='#f8f8f8', activeforeground='#4f4f4f')
            self.selected = False
        
    def select(self, *_):
        if not self.selected:
            self.master.set_active_tab(self)
            self.editor.grid(column=0, row=1, sticky=tk.NSEW)
            self.name.config(bg='white')
            self.config(bg="white")
            self.closebtn.config(bg='white', activeforeground='black')
            self.selected = True
