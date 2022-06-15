import tkinter as tk


class AButton(tk.Menubutton):
    def __init__(self, master, text, pane, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.pane = pane

        self.enabled = False
        self.config(
            height=1, width=2, relief=tk.FLAT, text=text, font=("codicon", 18), padx=12, pady=12,
            bg="#2c2c2c", fg="#7b7b7b", activebackground="#2c2c2c", activeforeground="#ffffff")
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
