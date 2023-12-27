from __future__ import annotations

import tkinter as tk
import typing

from biscuit.core.components.utils import Frame

from .kind import Kind

if typing.TYPE_CHECKING:
    from biscuit.core.components.lsp.data import Completion

    from . import AutoComplete


class CompletionItem(Frame):
    def __init__(self, master: AutoComplete, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.config(width=500, **self.base.theme.editors.autocomplete)
        self.bg, self.fg, self.hbg, self.hfg = self.base.theme.editors.autocomplete.item.values()

        self.selected = False
        self.hovered = False

        self.kind = None
        self.replace_start: str = ""
        self.replace_end: str = ""
        self.replace_text: str = ""
        self.documentation: str = ""
        # TODO add GUI for documentation

        self.kindw = Kind(self, self.master.kinds, self.kind)
        self.textw = tk.Text(self, 
            font=self.base.settings.font, fg=self.fg, bg=self.bg,
            relief=tk.FLAT, highlightthickness=0, width=30, height=1)

        self.textw.tag_config("term", foreground=self.base.theme.biscuit)
        self.textw.config(state=tk.DISABLED)

        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self.kindw.grid(row=0, column=0, sticky=tk.NSEW)
        self.textw.grid(row=0, column=1, sticky=tk.NSEW)

        self.kindw.bind("<Button-1>", self.on_click)
        self.textw.bind("<Button-1>", self.on_click)
        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.off_hover)
    
    def set_data(self, word: str, term: str):
        self.replace_start = ""
        self.replace_end = ""
        self.replace_text = word
        self.documentation = ""

        self.textw.config(state=tk.NORMAL)
        self.textw.delete(1.0, tk.END)
        self.textw.insert(tk.END, word)
        self.textw.config(state=tk.DISABLED)

        self.mark_term(word, term)
    
    def lsp_set_data(self, completion: Completion, term: str):
        self.replace_start = completion.replace_start
        self.replace_end = completion.replace_end
        self.replace_text = completion.replace_text
        self.documentation = completion.documentation

        self.textw.config(state=tk.NORMAL)
        self.textw.delete(1.0, tk.END)
        self.textw.insert(tk.END, completion.display_text)
        self.textw.config(state=tk.DISABLED)

        self.mark_term(completion.display_text, term)

    def clear_data(self):
        self.replace_start = ""
        self.replace_end = ""
        self.replace_text = ""
        self.documentation = ""

        self.textw.config(state=tk.NORMAL)
        self.textw.delete(1.0, tk.END)
        self.textw.config(state=tk.DISABLED)
    
    def clear_mark(self):
        self.textw.tag_remove("term", 1.0, tk.END)

    def mark_term(self, display_text: str, term: str):
        self.clear_mark()

        # Prioritize case sensitive match
        start_pos = display_text.find(term)
        if start_pos == -1:
            # Case insensitive match
            start_pos = display_text.lower().find(term)
            if start_pos == -1:
                return
        
        end_pos = start_pos + len(term)
        self.textw.tag_add("term", f"1.{start_pos}", f"1.{end_pos}")

    def on_click(self, *_):
        self.master.choose(this=self)

    def on_hover(self, *_):
        if not self.selected:
            self.kindw.config(bg=self.hbg)
            self.textw.config(bg=self.hbg)
            self.hovered = True

    def off_hover(self, *_):
        if not self.selected:
            self.kindw.config(bg=self.bg)
            self.textw.config(bg=self.bg)
            self.hovered = False

    def toggle_selection(self):
        if self.selected:
            self.select()
        else:
            self.deselect()

    def select(self):
        self.kindw.config(bg=self.hbg)
        self.textw.config(bg=self.hbg, fg=self.hfg)
        self.selected = True

    def deselect(self):
        self.kindw.config(bg=self.bg)
        self.textw.config(bg=self.bg, fg=self.fg)
        self.selected = False
