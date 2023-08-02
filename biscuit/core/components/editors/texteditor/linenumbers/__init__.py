import tkinter as tk

from ....utils import Canvas, Menubutton
from .breakpoint import Breakpoint


class LineNumbers(Canvas):
    """Line numbers bar
    supports marking lines, reconfiguring width, redraw on update,
    and breakpoints(experimental)

    Attributes
    ----------
    master
        parent tkinter widget
    text : Text
        tkinter Text widget attached to this line numbers bar
    font : tuple | str | Font
        font used in the line numbers bar

    Methods
    -------
    attach(text) -> None
        attaches a text widget to this line numbers bar
    mark_line(line, marker) -> None
        marks the passed line with a marker
    remove_mark() -> None
        removes set marker
    set_bar_width(width) -> None
        reconfigures the width of this line numbers bar
    redraw() -> None
        redraws all line numbers (to be bound to an update event)
    draw_breakpoint(line) -> None:
        draws a breakpoint for the specified line   
    """
    
    def __init__(self, master, text=None, font=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.font = font
        self.config(width=65, bd=0, highlightthickness=0, **self.base.theme.editors.linenumbers)
        self.text = text

        self.fg = self.base.theme.editors.linenumbers.number.foreground
        self.hfg = self.base.theme.editors.linenumbers.number.highlightforeground
        self.marker = None
        self.marked_line = None

    def attach(self, text: tk.Text):
        """Attach text widget to the line numbers bar

        Parameters
        ---------- 
        text : Text
            the tkinter text widget to attach to this line numbers bar
        """
        self.text = text
    
    def mark_line(self, line: str, marker: str=">") -> None:
        """Marks the line
        markers are not removed unless remove_mark is called

        Parameters
        ----------
        line : str
            line to be marked
        marker : str
            marker character
        """
        dline = self.text.dlineinfo(line)
        
        if not dline:
            return
        
        y = dline[1]
        btn = Menubutton(self, 
            text=marker , font=self.font, cursor="hand2", borderwidth=0,
            width=len(marker)+1, height=1, pady=0, padx=0, relief=tk.FLAT, **self.base.theme.editors.linenumbers)
        self.create_window(70, y-2, anchor=tk.NE, window=btn)
        self.marker = marker
        self.marked_line = line

    def remove_mark(self) -> None:
        "Removes the currently set marker"
        self.marker = None 
        self.marked_line = None
        self.redraw()
    
    def set_bar_width(self, width: int) -> None:
        """Set the width of line numbers bar

        Parameters
        ----------
        width : int
            width to be changed to
        """
        self.configure(width=width)
        
    def redraw(self, *_):
        "Redraws all line numbers, to be bound to an update event"
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
            if self.marked_line:
                self.mark_line(self.marked_line, marker=self.marker)

    # thing is soooo not optimized, like editor is not usable
    # when there are many breakpoints
    def draw_breakpoint(self, y):
        "Draw a breakpoint for the specified line(experimental)"
        bp = Breakpoint(self)
        self.create_window(21, y-2, anchor=tk.NE, window=bp)
