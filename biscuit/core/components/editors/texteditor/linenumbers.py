import tkinter as tk

from biscuit.core.utils import Canvas, Menubutton


class LineNumbers(Canvas):
    def __init__(self, master, text=None, font=None, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.font = font
        self.config(width=65, bd=0, highlightthickness=0, **self.base.theme.editors.linenumbers)
        self.text = text

        self.fg = self.base.theme.editors.linenumbers.number.foreground
        self.hfg = self.base.theme.editors.linenumbers.number.highlightforeground
        self.breakpoints = set()

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

    def toggle_breakpoint(self, line):
        if line in self.breakpoints:
            self.breakpoints.remove(line)
        else:
            self.breakpoints.add(line)
        self.redraw()

    def redraw(self, *_):
        self.delete(tk.ALL)

        if not self.text:
            return

        i = self.text.index("@0,0")
        while True:
            dline = self.text.dlineinfo(i)
            if dline is None:
                break

            y = dline[1]
            linenum = int(float(i))
            curline = self.text.dlineinfo(tk.INSERT)
            cur_y = curline[1] if curline else None

            # Check if the current line has a breakpoint
            has_breakpoint = linenum in self.breakpoints

            # Create breakpoint symbol if the line has a breakpoint
            if has_breakpoint:
                self.create_oval(5, y+3, 15, y + 13, fill="red", outline="")

            self.create_text(40, y, anchor=tk.NE, text=linenum, font=self.font, tag=i, fill=self.hfg if y == cur_y else self.fg)
            self.tag_bind(i, "<Button-1>", lambda _, linenum=linenum: self.toggle_breakpoint(linenum))

            i = self.text.index(f"{i}+1line")