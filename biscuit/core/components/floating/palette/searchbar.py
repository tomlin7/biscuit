import tkinter as tk
from itertools import chain

from biscuit.core.components.utils import Frame


class Searchbar(Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.biscuit)
        
        self.text_variable = tk.StringVar()
        self.text_variable.trace("w", self.filter) 
        
        frame = Frame(self, **self.base.theme.palette)
        frame.pack(fill=tk.BOTH, padx=1, pady=1)
        
        self.search_bar = tk.Entry(
            frame, font=("Segoe UI", 10), width=self.master.width, relief=tk.FLAT, 
            textvariable=self.text_variable, **self.base.theme.palette.searchbar)
        
        self.search_bar.grid(sticky=tk.EW, padx=5, pady=5)
        self.configure_bindings()

        self.term: str

    def configure_bindings(self):
        self.search_bar.bind("<Return>", self.master.search_bar_enter)

        self.search_bar.bind("<Down>", lambda e: self.master.select(1))
        self.search_bar.bind("<Up>", lambda e: self.master.select(-1))
    
    def clear(self):
        self.text_variable.set("")
    
    def focus(self):
        self.search_bar.focus()
    
    def add_prompt(self, prompt):
        self.text_variable.set(prompt)
        self.search_bar.icursor(tk.END)
    
    def get_search_term(self):
        return self.search_bar.get().lower()
    
    def filter(self, *args):
        term = self.get_search_term()

        prompt_found = False
        for actionset in self.master.actionsets:
            actionset = actionset()
            if term.startswith(actionset.prompt):
                self.master.pick_actionset(actionset)
                term = term[len(actionset.prompt):]
                prompt_found = True
                break
    
        if not prompt_found:
            self.master.pick_file_search()
        self.term = term
        exact, starts, includes = [], [], []
        for i in self.master.active_set:
            item = i[0]
            if item == term:
                exact.append(i)
            elif item.startswith(term):
                starts.append(i)
            elif term in item:
                includes.append(i)
        new = list(chain(exact, starts, includes))

        if any(new):
            self.master.show_items(new)
        else:
            self.master.show_no_results()
