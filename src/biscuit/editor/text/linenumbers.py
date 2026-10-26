from __future__ import annotations

import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from .text import Text
    from .editor import TextEditor

from biscuit.common.ui import Canvas, Menubutton
from .folding import CodeFoldingManager


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
        self.folding_manager = CodeFoldingManager()

    def attach(self, text):
        self.text = text
        self.text.folding_manager = self.folding_manager

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
        if not getattr(self.master, "debugger", None):
            return

        if line in self.breakpoints:
            self.breakpoints.remove(line)
        else:
            self.breakpoints.add(line)
        self.redraw()
        self.master.update_breakpoints(self.breakpoints)

    def update_folds(self) -> None:
        if not self.text:
            return
        try:
            content = self.text.get("1.0", "end-1c")
            lines = content.split("\n")
            folds = self.folding_manager.compute_indent_folds(lines)
            current_folded = {l: f.is_folded for l, f in self.folding_manager.folds.items() if f.is_folded}
            self.folding_manager.folds.clear()
            for start, end in folds:
                f = self.folding_manager.add_fold(start, end)
                if current_folded.get(start, False):
                    f.is_folded = True
        except Exception:
            pass

    def toggle_fold(self, linenum: int) -> bool:
        if not self.text or not self.folding_manager or linenum not in self.folding_manager.folds:
            return False

        fold = self.folding_manager.folds[linenum]
        is_folded = self.folding_manager.toggle_fold(linenum)
        tag_name = f"fold_{linenum}"

        if is_folded:
            start_idx = f"{linenum + 1}.0"
            end_idx = f"{fold.end_line + 1}.0"
            self.text.tag_config(tag_name, elide=True)
            self.text.tag_add(tag_name, start_idx, end_idx)
        else:
            self.text.tag_remove(tag_name, "1.0", tk.END)
            self.text.tag_delete(tag_name)

        self.redraw()
        if hasattr(self.master, "on_scroll"):
            self.master.on_scroll()
        return is_folded

    def fold_line(self, linenum: int) -> bool:
        if not self.folding_manager or linenum not in self.folding_manager.folds:
            return False
        if not self.folding_manager.is_line_folded(linenum):
            return self.toggle_fold(linenum)
        return True

    def unfold_line(self, linenum: int) -> bool:
        if not self.folding_manager or linenum not in self.folding_manager.folds:
            return False
        if self.folding_manager.is_line_folded(linenum):
            return self.toggle_fold(linenum)
        return False

    def is_line_folded(self, linenum: int) -> bool:
        return self.folding_manager.is_line_folded(linenum)

    def redraw(self, *_):
        self.delete(tk.ALL)

        if not self.text:
            return

        current_line = int(self.text.index(tk.INSERT).split('.')[0]) 
        win_height = self.winfo_height()
        try:
            max_line = int(self.text.index(tk.END).split(".")[0])
        except Exception:
            max_line = 999999

        i = self.text.index("@0,0")
        while True:
            dline = self.text.dlineinfo(i)
            if dline is None or (len(dline) > 3 and dline[3] == 0):
                try:
                    linenum = int(float(i))
                    if linenum >= max_line:
                        break
                    last_visible = self.text.index(f"@0,{win_height}")
                    if self.text.compare(i, ">", last_visible):
                        break
                except Exception:
                    break
                i = self.text.index(f"{i}+1line")
                continue

            y = dline[1]
            if y > win_height + 50:
                break

            linenum = int(float(i))
            curline = self.text.dlineinfo(tk.INSERT)
            cur_y = curline[1] if curline else None

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

            # Bind hover and click events for breakpoint
            self.tag_bind(
                breakpoint_id,
                "<Enter>",
                lambda _, breakpoint_id=breakpoint_id, flag=has_breakpoint: self.on_breakpoint_enter(
                    breakpoint_id, flag
                ),
            )
            self.tag_bind(
                breakpoint_id,
                "<Leave>",
                lambda _, breakpoint_id=breakpoint_id, flag=has_breakpoint: self.on_breakpoint_leave(
                    breakpoint_id, flag
                ),
            )
            self.tag_bind(
                breakpoint_id,
                "<Button-1>",
                lambda _, linenum=linenum: self.toggle_breakpoint(linenum),
            )

            # Render code folding indicator
            if self.folding_manager and linenum in self.folding_manager.folds and self.folding_manager.folds[linenum].end_line > linenum:
                is_folded = self.folding_manager.is_line_folded(linenum)
                arrow = "▶" if is_folded else "▼"
                fold_tag = f"fold_arrow_{linenum}"
                fold_id = self.create_text(
                    54,
                    y + 7,
                    anchor=tk.CENTER,
                    text=arrow,
                    font=self.font,
                    fill=self.fg,
                    tags=(fold_tag,),
                )
                self.tag_bind(
                    fold_tag,
                    "<Button-1>",
                    lambda _, l=linenum: self.toggle_fold(l),
                )
                self.tag_bind(
                    fold_tag,
                    "<Enter>",
                    lambda _, fid=fold_id: (self.itemconfig(fid, fill=self.hfg), self.config(cursor="hand2")),
                )
                self.tag_bind(
                    fold_tag,
                    "<Leave>",
                    lambda _, fid=fold_id: (self.itemconfig(fid, fill=self.fg), self.config(cursor="")),
                )

            if self.text.relative_line_numbers:
                if linenum != current_line:
                    linenum = abs(linenum - current_line)

            self.create_text(
                40,
                y,
                anchor=tk.NE,
                text=linenum,
                font=self.font,
                tag=i,
                fill=self.hfg if y == cur_y else self.fg,
            )

            self.tag_bind(
                i,
                "<Enter>",
                lambda _, breakpoint_id=breakpoint_id, flag=has_breakpoint: self.on_breakpoint_enter(
                    breakpoint_id, flag
                ),
            )

            self.tag_bind(
                i,
                "<Leave>",
                lambda _, breakpoint_id=breakpoint_id, flag=has_breakpoint: self.on_breakpoint_leave(
                    breakpoint_id, flag
                ),
            )

            i = self.text.index(f"{i}+1line")

    def on_breakpoint_enter(self, id, flag):
        self.itemconfig(id, fill=self.bp_enabled_color if flag else self.bp_hover_color)

    def on_breakpoint_leave(self, id, flag):
        self.itemconfig(id, fill=self.bp_enabled_color if flag else self.bg)
