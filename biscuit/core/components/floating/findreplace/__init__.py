import re
import tkinter as tk

from .results import FindResults
from biscuit.core.components.utils import IconButton, Frame, Toplevel, ButtonsEntry


class FindReplace(Toplevel):
    def __init__(self, base, *args, **kwargs):
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
        self.findbox = ButtonsEntry(self.container, hint="Find", textvariable=self.term, buttons=(('case-sensitive',), ('whole-word',), ('regex',)))
        self.findbox.grid(row=0, column=0, pady=2)

        self.results_count = FindResults(self.container)
        self.results_count.grid(row=0, column=1, sticky=tk.NSEW, padx=5, pady=2)
        
        buttons = Frame(self.container, **self.base.theme.findreplace)
        buttons.grid(row=0, column=2, sticky=tk.NSEW, pady=2)
        IconButton(buttons, 'arrow-up', self.prev_match).pack(side=tk.LEFT)
        IconButton(buttons, 'arrow-down', self.next_match).pack(side=tk.LEFT)
        IconButton(buttons, 'list-selection').pack(side=tk.LEFT) #TODO add finding from selection 
        IconButton(buttons, 'close', self.hide).pack(side=tk.LEFT)

        # replace
        self.replacebox = ButtonsEntry(self.container, hint="Replace", buttons=(('preserve-case',),))
        self.replacebox.grid(row=1, column=0, sticky=tk.NSEW, pady=2)

        buttons = Frame(self.container, **self.base.theme.findreplace)
        buttons.grid(row=1, column=1, sticky=tk.NSEW, padx=5, pady=2)
        IconButton(buttons, "replace", self.replace).pack(side=tk.LEFT)
        IconButton(buttons, "replace-all", self.replace_all).pack(side=tk.LEFT)

        self.term.trace("w", self.find)

        self.base.register_onfocus(self.lift)
        self.base.register_onupdate(self._follow_root)

    def _follow_root(self, *_):
        if not self.active:
            return
        
        self.update_idletasks()
        x = self.text.winfo_rootx() + self.text.winfo_width() - self.winfo_width() - self.offset
        y = self.text.winfo_rooty()
        self.geometry(f"+{x}+{y}")
    
    def show(self, text):
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
        else:
            return self.text.count("1.0", self.text.index(tk.INSERT), "chars")[0]
    
    def highlight_matches(self):
        self.text.tag_remove("found", "1.0", "end")
        self.text.tag_remove("foundcurrent", "1.0", "end")
        
        for pos, match in self.matches.items():
            start = match.start()
            end = match.end()
            self.text.tag_add(
                "found", f"1.0+{start}c", f"1.0+{end}c")
        
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
            self.text.delete(
                f"1.0 + {match.start()}c", f"1.0 + {match.end()}c")
            self.text.insert(
                f"1.0 + {self.current}c", self.replacestring)
            self.get_find_input()
        self.lift()
        self.text.focus()

    def is_on_match(self):
        """tells if the editor is currently pointing to a match"""
        if self.current in self.matches.keys():
            return True
        else:
            return False

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
