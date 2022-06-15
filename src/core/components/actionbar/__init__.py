import tkinter as tk

from .button import AButton


class Actionbar(tk.Frame):
    def __init__(self, master, left_panes=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.left_panes = left_panes
        self.btns = []

        self.config(bg='#2c2c2c', relief=tk.FLAT, bd=0)
        self.active_pane = None

        for i in self.left_panes:
            btn = self.create_button(text=i.icon, pane=i)
            self.btns.append(btn)

        self.settings_btn = tk.Menubutton(self)
        self.settings_btn.config(
            height=1, width=2, relief=tk.FLAT, text="\ueb51", font=("codicon", 18), padx=13, pady=13, 
            bg="#2c2c2c", fg="#7b7b7b", activebackground="#2c2c2c", activeforeground="#ffffff")
        self.settings_btn.pack(fill=tk.X, side=tk.BOTTOM)
    
    def refresh(self, btn):
        for i in self.btns:
            if (i != btn and i.enabled) or i == btn:
                i.toggle()
            
        for j in self.left_panes:
            if (j != btn.pane and j.active) or j == btn.pane:
                j.toggle()
    
    def toggle_pane(self, pane):
        self.active_pane = pane
        self.active_pane.toggle()
    
    def create_button(self, text, pane):
        btn = AButton(self, text=text, pane=pane)
        btn.pack(fill=tk.X, side=tk.TOP)
        
        return btn
    
    def toggle_active_pane(self):
        if self.active_pane:
            self.active_pane.toggle()
