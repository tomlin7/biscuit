from __future__ import annotations

import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from .text import Text

from src.biscuit.utils import Canvas, Menubutton


class LineNumbers(Canvas):
    def __init__(self, master, text: Text=None, font=None, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.font = font
        self.config(width=65, bd=0, highlightthickness=0, **self.base.theme.editors.linenumbers)
        self.text = text

        self.bg, self.fg, _, self.hfg = self.base.theme.editors.linenumbers.number.values()
        self.bp_hover_color, _, self.bp_enabled_color, _ = self.base.theme.editors.linenumbers.breakpoint.values()
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
        
        # current_line = int(self.text.index(tk.INSERT).split('.')[0])

        i = self.text.index("@0,0")
        while True:
            dline = self.text.dlineinfo(i)
            if dline is None:
                break

            y = dline[1]
            linenum = int(float(i))
            curline = self.text.dlineinfo(tk.INSERT)
            cur_y = curline[1] if curline else None

            # TODO: optional: skipping comments
            #             # check if line is commented
            # if self.text.highlighter and any((tag[1].startswith("Token.Comment") for tag in self.text.dump(i, i + " lineend", tag=True))):
            # if self.text.get(f"{i} linestart", f"{i} lineend").strip().startswith("#"):
            #     self.create_text(40, y, anchor=tk.NE, text="|   ", tag=i, fill=self.base.theme.border)
            #     i = self.text.index(f"{i}+1line")
            #     continue

            # Render breakpoint
            has_breakpoint = linenum in self.breakpoints
            breakpoint_id = self.create_oval(5, y + 3, 15, y + 13, outline="", fill=self.bg if not has_breakpoint else self.bp_enabled_color)

            # Bind hover and click events for breakpoint
            self.tag_bind(breakpoint_id, "<Enter>", 
                          lambda _, breakpoint_id=breakpoint_id, flag=has_breakpoint: self.on_breakpoint_enter(breakpoint_id, flag))
            self.tag_bind(breakpoint_id, "<Leave>", 
                          lambda _, breakpoint_id=breakpoint_id, flag=has_breakpoint: self.on_breakpoint_leave(breakpoint_id, flag))
            self.tag_bind(breakpoint_id, "<Button-1>", 
                          lambda _, linenum=linenum: self.toggle_breakpoint(linenum))

            # TODO: optional: line numbers relative to the current line
            # if linenum != current_line:
            #     linenum = abs(linenum - current_line)

            self.create_text(40, y, anchor=tk.NE, text=linenum, font=self.font, tag=i, fill=self.hfg if y == cur_y else self.fg)
            i = self.text.index(f"{i}+1line")

    def on_breakpoint_enter(self, id, flag):
        self.itemconfig(id, fill=self.bp_enabled_color if flag else self.bp_hover_color)

    def on_breakpoint_leave(self, id, flag):
        self.itemconfig(id, fill=self.bp_enabled_color if flag else self.bg)
