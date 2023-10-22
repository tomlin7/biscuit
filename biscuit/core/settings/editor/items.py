import tkinter as tk
from tkinter import ttk

from biscuit.core.components.utils import Entry, Frame


class Item(Frame):
    def __init__(self, master, name="Example", *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)

        self.name = name
        self.description = None # TODO add descriptions

        self.bg, self.fg, self.highlightbg, _ = self.base.theme.editors.section.values()
        self.config(padx=10, pady=10, bg=self.bg)

        self.lbl = tk.Label(self, text=self.name, font=("Segoi UI", 11, "bold"), anchor=tk.W, bg=self.bg, fg=self.fg)
        self.lbl.pack(fill=tk.X, expand=True)
        
    #     self.bind("<Enter>", self.hoverin)
    #     self.bind("<Leave>", self.hoveroff)
    
    # def hoverin(self, *_):
    #     self.config(bg=self.highlightbg)
    #     self.lbl.config(bg=self.highlightbg)
    
    # def hoveroff(self, *_):
    #     self.config(bg=self.bg)
    #     self.lbl.config(bg=self.bg)

class DropdownItem(Item):
    def __init__(self, master, name="Example", options=["True", "False"], default=0, *args, **kwargs) -> None:
        super().__init__(master, name, *args, **kwargs)

        self.var = tk.StringVar(self, value=options[default])
        m = ttk.OptionMenu(self, self.var, options[default], *options)
        m.config(width=30)
        m.pack(side=tk.LEFT)
        
    @property
    def value(self) -> str:
        return self.var.get()
    
    
class IntegerItem(Item):
    def __init__(self, master, name="Example", default="0", *args, **kwargs) -> None:
        super().__init__(master, name, *args, **kwargs)
        self.base.register(self.validate)

        self.entry = ttk.Entry(self, font=("Segoi UI", 11), width=30, validate="key", validatecommand=(self.register(self.validate), "%P"))
        self.entry.insert(0, default)
        self.entry.pack(side=tk.LEFT)

    def validate(self, value) -> None:
        return bool(value.isdigit() or value == "")

    @property
    def value(self) -> str:
        return self.entry.get()


class StringItem(Item):
    def __init__(self, master, name="Example", default="placeholder", *args, **kwargs) -> None:
        super().__init__(master, name, *args, **kwargs)

        self.entry = ttk.Entry(self, font=("Segoi UI", 11), width=30)
        self.entry.insert(tk.END, default)
        self.entry.pack(side=tk.LEFT)

    @property
    def value(self) -> str:
        return self.entry.get()


class CheckboxItem(Item):
    def __init__(self, master, name="Example", default=True, *args, **kwargs) -> None:
        super().__init__(master, name, *args, **kwargs)

        self.var = tk.BooleanVar(self, value=default)
        ttk.Checkbutton(self, text=name, variable=self.var).pack(fill=tk.X, anchor=tk.W)

    @property
    def value(self) -> str:
        return self.var.get()


#TODO list item with add to list button for taking list values
