import tkinter as tk

from biscuit.common.icons import Icons
from biscuit.common.ui import Scrollbar

from ..panelview import PanelView


class Problems(PanelView):
    """The Problems view.

    The Problems view displays the problems detected by the application.
    - Show errors, warnings, and other problems.
    - Clear all problems.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__actions__ = ((Icons.CLEAR_ALL, self.clear),)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        self.text = tk.Text(
            self,
            relief=tk.FLAT,
            padx=10,
            pady=10,
            font=("Consolas", 11),
            **self.base.theme.views.panel.logs
        )
        self.text.grid(row=0, column=0, sticky=tk.NSEW)

        self.scrollbar = Scrollbar(self)
        self.scrollbar.grid(sticky=tk.NSEW, row=0, column=1)

        self.text.config(yscrollcommand=self.scrollbar.set)
        self.scrollbar.config(command=self.text.yview)

        self.text.tag_config("no-problems", foreground="gray")
        self.clear()

    def write(self, text) -> None:
        self.text.config(state=tk.NORMAL)
        self.text.delete(1.0, tk.END)
        self.text.insert(tk.END, text)
        self.text.see(tk.END)
        self.text.config(state=tk.DISABLED)

    def clear(self, *_) -> None:
        self.text.config(state=tk.NORMAL)
        self.text.delete(1.0, tk.END)
        self.text.insert(tk.END, "No problems detected.", "no-problems")
        self.text.config(state=tk.DISABLED)
