import tkinter as tk
from tkinter import ttk


class Item(tk.Frame):
    def __init__(self, master, name="Example", *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        self.config(bg="white")

        self.name = name
        self.description = None # TODO add descriptions

        self.lbl = tk.Label(self, text=self.name, font=("Segoi UI", 15), bg="white", anchor=tk.W)
        self.lbl.pack(fill=tk.X, expand=True)
        
        self.bind("<Enter>", self.hoverin)
        self.bind("<Leave>", self.hoveroff)
    
    def hoverin(self, *_):
        self.config(bg="#f8f8f8")
        self.lbl.config(bg="#f8f8f8")
    
    def hoveroff(self, *_):
        self.config(bg="white")
        self.lbl.config(bg="white")

class DropdownItem(Item):
    def __init__(self, master, name="Example", options=["True", "False"], default=0, *args, **kwargs):
        super().__init__(master, name, *args, **kwargs)

        self.var = tk.StringVar(self, value=options[default])
        m = tk.OptionMenu(self, self.var, *options)
        m.config(relief=tk.FLAT, width=30, bg="#f8f8f8")
        m.pack(side=tk.LEFT)
        
    @property
    def value(self):
        return self.var.get()
    
    
class IntegerItem(Item):
    def __init__(self, master, name="Example", default="0", *args, **kwargs):
        super().__init__(master, name, *args, **kwargs)
        self.base.register(self.validate)

        self.entry = tk.Entry(self, font=("Segoi UI", 14), validate="key", validatecommand=(self.validate, "%P"),
                               width=30, relief=tk.FLAT, bg="#f8f8f8")
        self.entry.insert(tk.END, default)
        self.entry.pack(side=tk.LEFT)

    def validate(self, value):
        if value.isdigit() or value == "":
            return True
        else:
            return False

    @property
    def value(self):
        return self.entry.get()


class StringItem(Item):
    def __init__(self, master, name="Example", default="placeholder", *args, **kwargs):
        super().__init__(master, name, *args, **kwargs)

        self.entry = tk.Entry(self, font=("Segoi UI", 14), width=30, relief=tk.FLAT, bg="#f8f8f8")
        self.entry.insert(tk.END, default)
        self.entry.pack(side=tk.LEFT)

    @property
    def value(self):
        return self.entry.get()


class CheckboxItem(Item):
    def __init__(self, master, name="Example", default=True, *args, **kwargs):
        super().__init__(master, name, *args, **kwargs)

        self.var = tk.BooleanVar(self, value=default)
        tk.Checkbutton(self, text=name, variable=self.var, relief=tk.FLAT, anchor=tk.W, bg="white").pack(fill=tk.X, anchor=tk.W)

    @property
    def value(self):
        return self.var.get()
