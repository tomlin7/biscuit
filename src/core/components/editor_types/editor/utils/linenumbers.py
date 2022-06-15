import tkinter as tk


class LineNumbers(tk.Canvas):
    def __init__(self, master, text=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.font = self.master.font
        self.config(width=65, bg="#ffffff", bd=0, highlightthickness=0)
        self.text = text

    def attach(self, text):
        self.text = text
    
    def set_bar_width(self, width):
        self.configure(width=width)
        
    def redraw(self, *_):
        self.delete(tk.ALL)

        i = self.text.index("@0,0")
        while True :
            dline = self.text.dlineinfo(i)
            if dline is None: 
                break
            y = dline[1]
            linenum = str(i).split(".")[0]
            self.create_text(40, y, anchor=tk.NE, text=linenum, font=self.font, fill="#237893")
            i = self.text.index("%s+1line" % i)
