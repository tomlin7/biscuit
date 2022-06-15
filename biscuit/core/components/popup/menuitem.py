import tkinter as tk


class MenuItem(tk.Menubutton):
    def __init__(self, master, text, command, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.text = text
        self.command  = command
        
        self.config(text=text, anchor=tk.W, font=("Segoe UI", 10),
            padx=30, bg="#ffffff", fg="#616161", pady=3,
            activebackground="#e8e8e8", activeforeground="#616161"
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
        self.config(bg="#0060c0", fg="#ffffff", 
                    activebackground="#0060c0", activeforeground="#ffffff")
        self.selected = True
    
    def deselect(self):
        self.config(bg="#ffffff", fg="#616161", 
                    activebackground="#e8e8e8", activeforeground="#616161")
        self.selected = False