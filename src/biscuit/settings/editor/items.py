import tkinter as tk
from tkinter import ttk

from biscuit.common.ui import Entry, Frame


class Item(Frame):
    def __init__(self, master, name="Example", callback=None, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)

        self.name = name
        self.callback = callback
        self.description = None  # TODO add descriptions

        self.bg, self.fg, self.highlightbg, _ = self.base.theme.editors.section.values()
        self.config(padx=10, pady=10, bg=self.bg)

        self.lbl = tk.Label(
            self,
            text=self.name,
            font=self.base.settings.uifont_bold,
            anchor=tk.W,
            bg=self.bg,
            fg=self.fg,
        )
        self.lbl.pack(fill=tk.X, expand=True)

    def change(self, *_) -> None:
        if self.callback:
            self.callback(self.value)


class DropdownItem(Item):
    def __init__(
        self,
        master,
        name="Example",
        options=["True", "False"],
        default=0,
        callback=None,
        *args,
        **kwargs
    ) -> None:
        super().__init__(master, name, callback, *args, **kwargs)

        if isinstance(default, str):
            try:
                default = options.index(default)
            except ValueError:
                default = 0

        self.var = tk.StringVar(self, value=options[default])
        self.var.trace_add("write", self.change)
        
        m = ttk.OptionMenu(self, self.var, options[default], *options)
        m.config(width=30)
        m.pack(side=tk.LEFT)

    @property
    def value(self) -> str:
        return self.var.get()


class IntegerItem(Item):
    def __init__(self, master, name="Example", default="0", callback=None, *args, **kwargs) -> None:
        super().__init__(master, name, callback, *args, **kwargs)
        self.base.register(self.validate)

        self.entry = ttk.Entry(
            self,
            font=self.base.settings.uifont,
            width=30,
            validate="key",
            validatecommand=(self.register(self.validate), "%P"),
        )
        self.entry.insert(0, str(default))
        self.entry.pack(side=tk.LEFT)
        self.entry.bind("<Return>", self.change)
        self.entry.bind("<FocusOut>", self.change)

    def validate(self, value) -> None:
        return bool(value.isdigit() or value == "")

    @property
    def value(self) -> str:
        return self.entry.get()


class StringItem(Item):
    def __init__(
        self, master, name="Example", default="placeholder", callback=None, *args, **kwargs
    ) -> None:
        super().__init__(master, name, callback, *args, **kwargs)

        self.entry = ttk.Entry(self, font=self.base.settings.uifont, width=30)
        self.entry.insert(tk.END, default)
        self.entry.pack(side=tk.LEFT)
        self.entry.bind("<Return>", self.change)
        self.entry.bind("<FocusOut>", self.change)

    @property
    def value(self) -> str:
        return self.entry.get()


class CheckboxItem(Item):
    def __init__(self, master, name="Example", default=True, callback=None, *args, **kwargs) -> None:
        super().__init__(master, name, callback, *args, **kwargs)

        self.var = tk.BooleanVar(self, value=default)
        self.var.trace_add("write", self.change)

        ttk.Checkbutton(self, text=name, variable=self.var, cursor="hand2").pack(
            fill=tk.X, anchor=tk.W
        )

    @property
    def value(self) -> str:
        return self.var.get()


# TODO list item with add to list button for taking list values
