import tkinter as tk

from core.components.utils import Frame

from .items import CheckboxItem, DropdownItem, IntegerItem, StringItem


class Section(Frame):
    def __init__(self, master, title="", *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.editors, padx=30)

        self.items = []
        tk.Label(self, text=title, font=("Segoi UI", 22, "bold"), anchor=tk.W, **self.base.theme.editors.labels).pack(fill=tk.X, expand=True)

    def add_dropdown(self, name="Example", options=["True", "False"], default=0):
        dropdown = DropdownItem(self, name, options, default)
        dropdown.pack(fill=tk.X, expand=True)
        self.items.append(dropdown)
        
    def add_stringvalue(self, name="Example", default="placeholder"):
        string = StringItem(self, name, default)
        string.pack(fill=tk.X, expand=True)
        self.items.append(string)

    def add_intvalue(self, name="Example", default="0"):
        int = IntegerItem(self, name, default)
        int.pack(fill=tk.X, expand=True)
        self.items.append(int)
    
    def add_checkbox(self, name="Example", default=True):
        dropdown = CheckboxItem(self, name, default)
        dropdown.pack(fill=tk.X, expand=True)
        self.items.append(dropdown)
