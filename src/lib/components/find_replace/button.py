import tkinter as tk


class Button(tk.Frame):
    def __init__(self, master, bg, hbg, img=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.img = img
        self.hovered = False

        self.hbg = hbg
        self.bg = bg
        
        self.imagew = tk.Label(self, image=self.img)
        self.imagew.config(bg=self.bg, relief=tk.FLAT)
        self.imagew.grid(row=0, column=0, sticky=tk.NS)

        self.config(bg=self.bg, pady=3, padx=3, cursor="hand2")
        self.config_bindings()

    def config_bindings(self):
        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.off_hover)
        self.bind("<Button-1>", self.on_click)

    def set_image(self, img):
        self.img = img
        self.imagew.config(image=self.img)
        
    def on_click(self, *args):
        pass
    
    def on_hover(self, *args):
        self.hovered = True
        self.imagew.config(bg=self.hbg)
        self.config(bg=self.hbg)

    def off_hover(self, *args):
        self.hovered = False
        self.imagew.config(bg=self.bg)
        self.config(bg=self.bg)
