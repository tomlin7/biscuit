from __future__ import annotations

import re
import tkinter as tk
import typing

from biscuit.common.icons import Icons
from biscuit.common.ui import ButtonsEntry, Frame, IconButton, Toplevel

if typing.TYPE_CHECKING:
    from biscuit.common.ui import Text

from .results import FindResults


class FindReplace(Toplevel):
    """Floating find and replace window"""

    def __init__(self, base, *args, **kwargs) -> None:
        super().__init__(base, *args, **kwargs)
        self.offset = 10
        self.active = False
        self.overrideredirect(True)
        self.config(padx=1, pady=1, bg=self.base.theme.border)
        self.withdraw()

        self.text = None
        self.matchstring = None
        self.replacestring = None
        self.matches = None
        self.term = tk.StringVar()

        self.container = Frame(self, padx=5, pady=5, **self.base.theme.findreplace)
        self.container.pack(fill=tk.BOTH)
        self.container.grid_columnconfigure(0, weight=1)

        # find
        self.findbox = ButtonsEntry(
            self.container,
            hint="Find",
            textvariable=self.term,
            buttons=((Icons.CASE_SENSITIVE,), (Icons.WHOLE_WORD,), (Icons.REGEX,)),
        )
        self.findbox.grid(row=0, column=0, pady=2)

        self.results_count = FindResults(self.container)
        self.results_count.grid(row=0, column=1, sticky=tk.NSEW, padx=5, pady=2)

        buttons = Frame(self.container, **self.base.theme.findreplace)
        buttons.grid(row=0, column=2, sticky=tk.NSEW, pady=2)
        IconButton(buttons, Icons.ARROW_UP, self.prev_match).pack(side=tk.LEFT)
        IconButton(buttons, Icons.ARROW_DOWN, self.next_match).pack(side=tk.LEFT)
        IconButton(buttons, Icons.LIST_SELECTION).pack(
            side=tk.LEFT
        )  # TODO add finding from selection
        IconButton(buttons, Icons.CLOSE, self.hide).pack(side=tk.LEFT)

        # replace
        self.replacebox = ButtonsEntry(
            self.container, hint="Replace", buttons=((Icons.PRESERVE_CASE),)
        )
        self.replacebox.grid(row=1, column=0, sticky=tk.NSEW, pady=2)

        buttons = Frame(self.container, **self.base.theme.findreplace)
        buttons.grid(row=1, column=1, sticky=tk.NSEW, padx=5, pady=2)
        IconButton(buttons, Icons.REPLACE, self.replace).pack(side=tk.LEFT)
        IconButton(buttons, Icons.REPLACE_ALL, self.replace_all).pack(side=tk.LEFT)

        self.term.trace_add("write", self.find)

        self.base.bind("<FocusIn>", lambda *_: self.lift, add=True)
        self.base.bind("<Configure>", self._follow_root, add=True)

    def _follow_root(self, *_):
        if not self.active:
            return

        try:

            self.update_idletasks()
            x = (
                self.text.winfo_rootx()
                + self.text.winfo_width()
                - self.winfo_width()
                - self.offset
            )
            y = self.text.winfo_rooty()
            self.geometry(f"+{x}+{y}")
        except tk.TclError:
            # root was destroyed
            pass

    def show(self, text: Text):
        self.text = text
        self.active = True
        self.update_idletasks()

        if self.text.tag_ranges(tk.SEL):
            selection = self.text.get(tk.SEL_FIRST, tk.SEL_LAST)
            self.findbox.delete("0", "end")
            self.findbox.insert("0", selection)
            self.text.mark_set("insert", tk.SEL_FIRST)
            self.get_find_input()

        self._follow_root()
        self.deiconify()
        self.lift()
        self.findbox.focus()

    def hide(self, *_):
        self.active = False
        self.text.tag_remove("found", "1.0", "end")
        self.text.tag_remove("foundcurrent", "1.0", "end")
        self.withdraw()

    @property
    def current(self):
        if not self.text.count("1.0", self.text.index(tk.INSERT), "chars"):
            return 0
        return self.text.count("1.0", self.text.index(tk.INSERT), "chars")[0]

    def highlight_matches(self):
        self.text.tag_remove("found", "1.0", "end")
        self.text.tag_remove("foundcurrent", "1.0", "end")

        for pos, match in self.matches.items():
            start = match.start()
            end = match.end()
            self.text.tag_add("found", f"1.0+{start}c", f"1.0+{end}c")

        if self.is_on_match():
            self.highlight_current()

    def highlight_current(self):
        self.text.tag_remove("foundcurrent", "1.0", "end")

        current = self.current
        match = self.matches[current]

        start = match.start()
        end = match.end()
        self.text.tag_add("foundcurrent", f"1.0+{start}c", f"1.0+{end}c")

    def get_find_input(self):
        if self.findbox.get() == "":
            self.text.tag_remove("found", "1.0", "end")
            self.text.tag_remove("foundcurrent", "1.0", "end")
            return

        current = self.current
        self.matches = {}
        self.matchstring = self.findbox.get()
        self.re_ = re.compile(self.matchstring)

        for match in self.re_.finditer(self.text.get_all_text()):
            self.matches[match.start()] = match

        self.highlight_matches()
        self.text.mark_set("insert", f"1.0 + {current}c")
        self.results_count.show(len(self.matches))

    def find(self, *_):
        """Find all matches and highlight them"""
        try:
            self.text = self.base.editorsmanager.active_editor.content.text
        except AttributeError:
            return

        self.get_find_input()
        self.lift()

    def next_match(self, *_):
        """Moves the editor focus to the next match"""
        if self.findbox.get() != self.matchstring:
            self.get_find_input()

        matchpos = [i for i in sorted(self.matches.keys()) if i > self.current]

        if len(matchpos) > 0:
            next_index = f"1.0 + {matchpos[0]}c"
            self.text.mark_set("insert", next_index)
            self.text.see(next_index)
            self.highlight_current()
        elif len(self.matches) > 0:
            self.text.mark_set("insert", "1.0")

            if self.is_on_match():
                self.highlight_current()
            else:
                self.next_match()

        self.lift()
        self.text.focus()

    def prev_match(self, *_):
        """Moves the editor focus to the previous match"""
        if self.findbox.get() != self.matchstring:
            self.get_find_input()
        matchpos = [i for i in sorted(self.matches.keys()) if i < self.current]
        if len(matchpos) > 0:
            next_index = f"1.0 + {matchpos[-1]}c"
            self.text.mark_set("insert", next_index)
            self.text.see(next_index)
            self.highlight_current()
        elif len(self.matches) > 0:
            self.text.mark_set("insert", "end")
            self.prev_match()
        self.lift()
        self.text.focus()

    def replace(self, *_):
        """replaces current (in focus) match, removing the match and writing the replace string"""
        self.replacestring = self.replacebox.get()
        if self.findbox.get() != self.matchstring:
            self.get_find_input()
        if self.is_on_match():
            match = self.matches[self.current]
            self.text.delete(f"1.0 + {match.start()}c", f"1.0 + {match.end()}c")
            self.text.insert(f"1.0 + {self.current}c", self.replacestring)
            self.get_find_input()
        self.lift()
        self.text.focus()

    def is_on_match(self):
        """tells if the editor is currently pointing to a match"""
        return self.current in self.matches

    def replace_all(self, *_):
        """replaces all occurences of the string for the replace string, it will even replace partial words."""
        self.get_find_input()
        nmatches = len(self.matches)
        current = self.current
        self.text.mark_set("insert", "1.0")
        self.replace()
        for i in range(nmatches):
            self.next_match()
            self.replace()
        self.text.mark_set("insert", f"1.0 + {current}c")
