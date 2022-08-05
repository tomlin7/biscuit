import tkinter as tk


class Slot(tk.Menubutton):
    def __init__(self, master, text, pane, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base 

        self.pane = pane
        self.enabled = False
        
        self.config(text=text, relief=tk.FLAT, font=("codicon", 18), padx=10, pady=10)
        self.pack(fill=tk.X, side=tk.TOP)
        
        self.bind('<Button-1>', self.on_click)
    
    def on_click(self, *_):
        self.master.refresh(self)
        
    def toggle(self, *_):
        self.enabled = not self.enabled
        if self.enabled:
            self.config(fg="#ffffff")
        else:
            self.config(fg="#7b7b7b")
