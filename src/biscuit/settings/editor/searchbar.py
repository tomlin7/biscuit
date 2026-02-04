import tkinter as tk

from hintedtext import HintedEntry

from biscuit.common.ui import Frame


class Searchbar(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.config(bg=self.base.theme.biscuit)

        frame = Frame(self, **self.base.theme.editors)
        frame.pack(fill=tk.BOTH, padx=1, pady=1)

        self.text_variable = tk.StringVar()
        self.searchbar = HintedEntry(
            frame,
            font=self.base.settings.uifont,
            hint="Search settings",
            relief=tk.FLAT,
            textvariable=self.text_variable,
            **self.base.theme.editors.text
        )
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
        self.master.show_result(term)
