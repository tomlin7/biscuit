import tkinter as tk

from hintedtext import HintedEntry
from core.components.utils import Frame


class Searchbar(Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master

        # border
        self.config(bg="#ecb464")
        
        frame = Frame(self, bg="#FFFFFF")
        frame.pack(fill=tk.BOTH, padx=1, pady=1)
        
        self.text_variable = tk.StringVar()
        self.searchbar = HintedEntry(
            frame, font=("Segoe UI", 12), fg="#616161", hint="Search settings",
            relief=tk.FLAT, bg="#FFFFFF", 
            textvariable=self.text_variable)
        self.text_variable.trace("w", self.filter) 
        self.searchbar.pack(fill=tk.X, expand=True, pady=5, padx=5)
        self.configure_bindings()

    def configure_bindings(self):
        ...

    def clear(self):
        self.text_variable.set("")
    
    def focus(self):
        self.searchbar.focus()
    
    def get_search_term(self):
        return self.searchbar.get().lower()
    
    def filter(self, *args):
        term = self.get_search_term()
        return
        new = [i for i in self.master.active_set if i[0].lower().startswith(term.lower())]
        new += [i for i in self.master.active_set if any([f.lower() in i[0].lower() or i[0].lower() in f.lower() and i not in new for f in term.lower().split()])]
        
        self.master.show_result(new)
