import tkinter as tk

from hintedtext import HintedEntry

from src.biscuit.utils import Frame


class Searchbar(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.config(bg=self.base.theme.biscuit)

        frame = Frame(self, **self.base.theme.editors)
        frame.pack(fill=tk.BOTH, padx=1, pady=1)

        self.text_variable = tk.StringVar()
        self.searchbar = HintedEntry(
            frame, font=("Segoe UI", 12),hint="Search settings",
            relief=tk.FLAT, textvariable=self.text_variable, **self.base.theme.editors.text)
        self.searchbar.pack(fill=tk.X, expand=True, pady=5, padx=5)

        self.configure_bindings()

    def configure_bindings(self) -> None:
        self.text_variable.trace("w", self.filter) 

    def clear(self) -> None:
        self.text_variable.set("")

    def focus(self) -> None:
        self.searchbar.focus()

    def get_search_term(self) -> str:
        return self.searchbar.get().lower()

    def filter(self, *args) -> str:
        term = self.get_search_term()
        return
        new = [i for i in self.master.active_set if i[0].lower().startswith(term.lower())]
        new += [i for i in self.master.active_set if any([f.lower() in i[0].lower() or i[0].lower() in f.lower() and i not in new for f in term.lower().split()])]

        self.master.show_result(new)
