import tkinter as tk


class LineNumbers(tk.Canvas):
    def __init__(self, master, text=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.configure(width=50)
        self.text = text

    def attach(self, text):
        self.text = text
        
    def redraw(self, *args):
        self.delete(tk.ALL)

        i = self.text.index("@0,0")
        while True :
            dline = self.text.dlineinfo(i)
            if dline is None: 
                break
            y = dline[1]
            linenum = str(i).split(".")[0]
            self.create_text(3, y, anchor=tk.NW, text=linenum, font=self.base.settings.font)
            i = self.text.index("%s+1line" % i)
