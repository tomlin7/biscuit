from __future__ import annotations

import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from .text import Text
    from .editor import TextEditor

from biscuit.common.ui import Canvas, Menubutton


class LineNumbers(Canvas):
    """Line Numbers widget

    This widget is used to display line numbers for the text widget.
    It also provides the functionality to toggle breakpoints on the lines.
    """

    def __init__(self, master: TextEditor, text: Text = None, *args, **kwargs) -> None:
        """Line Numbers widget

        Args:
            master: The parent widget
            text (Text, optional): The text widget to attach. Defaults to None.
        """

        super().__init__(master, *args, **kwargs)
        self.master: TextEditor = master
        self.config(
            width=65, bd=0, highlightthickness=0, **self.base.theme.editors.linenumbers
        )
        self.text = text
        self.font = self.base.settings.font

        self.bg, self.fg, _, self.hfg = (
            self.base.theme.editors.linenumbers.number.values()
        )
        self.bp_hover_color, _, self.bp_enabled_color, _ = (
            self.base.theme.editors.linenumbers.breakpoint.values()
        )
        self.breakpoints: set[int] = set()

    def attach(self, text):
        self.text = text

    def mark_line(self, line):
        dline = self.text.dlineinfo(line)

        if not dline:
            return

        y = dline[1]
        btn = Menubutton(
            self,
            text=">",
            font=self.base.settings.font,
            cursor="hand2",
            borderwidth=0,
            width=2,
            height=1,
            pady=0,
            padx=0,
            relief=tk.FLAT,
            **self.base.theme.linenumbers,
        )
        self.create_window(70, y - 2, anchor=tk.NE, window=btn)

    def set_bar_width(self, width):
        self.configure(width=width)

    def toggle_breakpoint(self, line):
        if line in self.breakpoints:
            self.breakpoints.remove(line)
        else:
            self.breakpoints.add(line)
        self.redraw()
        self.master.update_breakpoints(self.breakpoints)

    def redraw(self, *_):
        self.delete(tk.ALL)

        if not self.text:
            return

        # Fetch insertion info once per redraw
        insert_idx = self.text.index(tk.INSERT)
        current_line = int(insert_idx.split('.')[0])
        curline_info = self.text.dlineinfo(insert_idx)
        cur_y = curline_info[1] if curline_info else None

        i = self.text.index("@0,0")
        while True:
            dline = self.text.dlineinfo(i)
            if dline is None:
                break

            y = dline[1]
            linenum = int(float(i))

            # Render breakpoint
            has_breakpoint = linenum in self.breakpoints
            breakpoint_id = self.create_oval(
                5,
                y + 3,
                15,
                y + 13,
                outline="",
                fill=self.bg if not has_breakpoint else self.bp_enabled_color,
            )

            # Bind events for breakpoint (Consider moving to static bindings if performance persists)
            def on_enter(e, b_id=breakpoint_id, hb=has_breakpoint):
                self.on_breakpoint_enter(b_id, hb)
            def on_leave(e, b_id=breakpoint_id, hb=has_breakpoint):
                self.on_breakpoint_leave(b_id, hb)
            def on_click(e, ln=linenum):
                self.toggle_breakpoint(ln)

            self.tag_bind(breakpoint_id, "<Enter>", on_enter)
            self.tag_bind(breakpoint_id, "<Leave>", on_leave)
            self.tag_bind(breakpoint_id, "<Button-1>", on_click)

            display_linenum = linenum
            if self.text.relative_line_numbers:
                if linenum != current_line:
                    display_linenum = abs(linenum - current_line)

            txt_id = self.create_text(
                40,
                y,
                anchor=tk.NE,
                text=display_linenum,
                font=self.font,
                tag=i,
                fill=self.hfg if y == cur_y else self.fg,
            )

            self.tag_bind(txt_id, "<Enter>", on_enter)
            self.tag_bind(txt_id, "<Leave>", on_leave)

            i = self.text.index(f"{i}+1line")

    def on_breakpoint_enter(self, id, flag):
        self.itemconfig(id, fill=self.bp_enabled_color if flag else self.bp_hover_color)

    def on_breakpoint_leave(self, id, flag):
        self.itemconfig(id, fill=self.bp_enabled_color if flag else self.bg)
