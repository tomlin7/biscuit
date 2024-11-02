import tkinter as tk

from hintedtext import HintedEntry

from biscuit.common.icons import Icons
from biscuit.common.ui import Entry, Frame, Scrollbar

from ..panelview import PanelView

HELP = """
Welcome to Biscuit Inspect Console
----------------------------------

This is a Python console that allows you to interact with the Biscuit at runtime.
You can use this console to run commands, check the status of the application, and more.
`self` refers to the App instance, and you can access all the attributes and methods of the App class.

example usage:
- self.open_editor("path/to/file", False).content.text.write("Hello, World!")

Custom commands:
- help: Show this help message
- clear: Clear the console
"""


class Inspect(PanelView):
    """The Inspect view."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__actions__ = ((Icons.CLEAR_ALL, self.clear),)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        container = Frame(self)
        container.grid(row=0, column=0, sticky=tk.NSEW)

        container.rowconfigure(0, weight=1)
        container.columnconfigure(0, weight=1)

        self.text = tk.Text(
            container,
            relief=tk.FLAT,
            padx=10,
            pady=10,
            font=("Consolas", 11),
            **self.base.theme.editors.text,
        )
        self.text.grid(row=0, column=0, sticky=tk.NSEW)

        self.scrollbar = Scrollbar(container, style="EditorScrollbar")
        self.scrollbar.grid(sticky=tk.NSEW, row=0, column=1)

        frame = Frame(
            self,
            padx=5,
            pady=5,
            bg=self.base.theme.layout.background,
        )
        frame.grid(row=1, column=0, sticky=tk.NSEW, pady=(1, 0))

        self.entry = HintedEntry(
            frame,
            relief=tk.FLAT,
            font=("Consolas", 11),
            hint="Use /help for help",
            bg=self.base.theme.layout.background,
            fg=self.base.theme.layout.foreground,
        )
        self.entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.entry.bind("<Return>", self.enter)
        self.entry.bind("<Up>", self.previous_command)
        self.entry.bind("<Down>", self.next_command)

        self.text.tag_config(
            "hline",
            background=self.base.theme.border,
            bgstipple=f"@{self.base.resources.line}",
        )

        self.text.config(yscrollcommand=self.scrollbar.set)
        self.scrollbar.config(command=self.text.yview)

        self.history = []
        self.history_index = -1

        self.show_help()
        self.text.config(state=tk.DISABLED)

    def enter(self, *_) -> None:
        text = self.entry.get()
        self.write()
        self.entry.delete(0, tk.END)

        if text.strip():
            self.history.append(text)
            self.history_index = len(self.history)

        match text:
            case "/help":
                self.show_help()
            case "/clear":
                self.clear()

        if result := self.base.control_execute(text):
            self.write(str(result))

        self.show_separator()

    def previous_command(self, _):
        if self.history:
            self.history_index = max(0, self.history_index - 1)
            self.entry.delete(0, tk.END)
            self.entry.insert(0, self.history[self.history_index])

    def next_command(self, _):
        if self.history:
            self.history_index = min(len(self.history), self.history_index + 1)
            self.entry.delete(0, tk.END)
            if self.history_index < len(self.history):
                self.entry.insert(0, self.history[self.history_index])

    def write(self, text="") -> None:
        self.text.config(state=tk.NORMAL)
        self.text.insert(tk.END, f"{text}\n")
        self.text.see(tk.END)
        self.text.config(state=tk.DISABLED)

    def show_help(self) -> None:
        self.write(HELP)

    def show_separator(self) -> None:
        self.text.config(state=tk.NORMAL)
        self.text.insert(tk.END, "\n", "hline")
        self.text.config(state=tk.DISABLED)

    def clear(self, *_) -> None:
        self.text.config(state=tk.NORMAL)
        self.text.delete(1.0, tk.END)
        self.text.config(state=tk.DISABLED)
