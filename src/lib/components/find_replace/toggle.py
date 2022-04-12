import tkinter as tk


class ToggleButton(tk.Frame):
    def __init__(self, master, bg, hbg, sbg, img=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.img = img
        
        self.hovered = False
        self.state = False

        self.bg = bg
        self.hbg = hbg
        self.sbg = sbg

        self.imagew = tk.Label(self, image=self.img)
        self.imagew.config(bg=self.bg, relief=tk.FLAT)
        self.imagew.grid(row=0, column=0, sticky=tk.NS)

        self.config(bg=self.bg, pady=3, padx=3, cursor="hand2")
        self.config_bindings()

    def config_bindings(self):
        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.off_hover)
        self.bind("<Button-1>", self.toggle)

    def set_image(self, img):
        self.img = img
        self.imagew.config(image=self.img)
    
    def redraw(self):
        if self.state:
            self.config(bg=self.sbg)
            return 
        
        if self.hovered:
            self.config(bg=self.hbg)
        else:
            self.config(bg=self.bg)
        
    def toggle(self, *args):
        self.state = not self.state
    
    def on_hover(self, *args):
        self.hovered = True
        self.redraw()

    def off_hover(self, *args):
        self.hovered = False
        self.redraw()
