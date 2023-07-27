import tkinter as tk

from ....utils import Canvas, Menubutton
from .breakpoint import Breakpoint


class LineNumbers(Canvas):
    def __init__(self, master, text=None, font=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.font = font
        self.config(width=65, bd=0, highlightthickness=0, **self.base.theme.editors.linenumbers)
        self.text = text

        self.fg = self.base.theme.editors.linenumbers.number.foreground
        self.hfg = self.base.theme.editors.linenumbers.number.highlightforeground

    def attach(self, text):
        self.text = text
    
    def mark_line(self, line):
        dline = self.text.dlineinfo(line)
        
        if not dline:
            return
        
        y = dline[1]
        btn = Menubutton(self, 
            text=">", font=self.font, cursor="hand2", borderwidth=0,
            width=2, height=1, pady=0, padx=0, relief=tk.FLAT, **self.base.theme.linenumbers)
        self.create_window(70, y-2, anchor=tk.NE, window=btn)
    
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

            curline = self.text.dlineinfo(tk.INSERT)
            cur_y = curline[1] if curline else None

            self.create_text(40, y, anchor=tk.NE, text=linenum, font=self.font, tag=i, fill=self.hfg if y == cur_y else self.fg)
            self.tag_bind(i, "<Button-1>", lambda _, i=i: self.text.select_line(i))

            # TODO drawing breakpoints - need optimisations
            # self.draw_breakpoint(y)
            
            i = self.text.index(f"{i}+1line")
    
    def draw_breakpoint(self, y):
        bp = Breakpoint(self)
        self.create_window(21, y-2, anchor=tk.NE, window=bp)
