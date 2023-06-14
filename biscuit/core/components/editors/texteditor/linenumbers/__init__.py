import tkinter as tk

from .breakpoint import Breakpoint


class LineNumbers(tk.Canvas):
    def __init__(self, master, text=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.fill = "#6e7681"
        self.highlight_fill = "#171184"

        self.font = self.master.font
        self.config(width=65, bg="#ffffff", bd=0, highlightthickness=0)
        self.text = text

    def attach(self, text):
        self.text = text
    
    def mark_line(self, line):
        dline = self.text.dlineinfo(line)
        
        if not dline:
            return
        
        y = dline[1]
        btn = tk.Menubutton(self, 
            text=">", font=("Consolas", 14), fg="#1e1e1e", bg="#1e1e1e", cursor="hand2", 
            activeforeground="#c5c5c5", activebackground="#1e1e1e", borderwidth=0,
            width=2, height=1, pady=0, padx=0, relief=tk.FLAT)
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

            # to highlight current line
            curline = self.text.dlineinfo(tk.INSERT)
            cur_y = curline[1] if curline else None

            if y == cur_y:
                self.create_text(40, y, anchor=tk.NE, text=linenum, font=self.font, fill=self.highlight_fill, tag=i)
            else:
                self.create_text(40, y, anchor=tk.NE, text=linenum, font=self.font, fill=self.fill, tag=i)
            
            self.tag_bind(i, "<Button-1>", lambda _, i=i: self.text.select_line(i))

            # TODO drawing breakpoints - need optimisations
            # self.draw_breakpoint(y)
            
            i = self.text.index(f"{i}+1line")
    
    def draw_breakpoint(self, y):
        bp = Breakpoint(self)
        self.create_window(21, y-2, anchor=tk.NE, window=bp)
