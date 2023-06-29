import tkinter as tk

from .findbox import FindBox
from .replacebox import ReplaceBox
from .results import FindResults

from core.components.utils import IconButton


class Toggle(IconButton):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, icon='chevron-right', icon2='chevron-down', *args, **kwargs)

    def v_onclick(self):
        if self.state:
            self.config(pady=30, padx=2)
        else:
            self.config(pady=10, padx=5)
        self.master.toggle_replace(self.state)


class FindReplace(tk.Toplevel):
    def __init__(self, base, *args, **kwargs):
        super().__init__(base, *args, **kwargs)
        self.base = base
        
        self.offset = 10
        self.active = False
        self.overrideredirect(True)
        self.config(bg="#454545")
        self.withdraw()
        
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)

        toggle = Toggle(self)
        toggle.grid(row=0, column=0, sticky=tk.NS, padx=(2, 0))

        container = tk.Frame(self)
        container.config(bg="#252526")
        container.replace_enabled = False
        container.grid_columnconfigure(0, weight=1)
        container.grid(row=0, column=1, sticky=tk.NSEW)

        # self.find_entry = FindBox(self, width=20)
        # self.results_count = FindResults(self)
        # self.replace_entry = ReplaceBox(self, width=20)

        # self.replace_btn_holder = tk.Frame(self, bg="#252526", pady=2)
        # self.replace_button = IconButton(self.replace_btn_holder, "replace-all")

        # self.find_btns_holder = tk.Frame(self, bg="#252526", pady=6)
        # self.selection_button = IconButton(self.find_btns_holder, 'list-selection')
        # self.close_button = IconButton(self.find_btns_holder, 'close')
        
        # self.find_entry.grid(row=0, column=0, sticky=tk.NSEW, pady=5)
        # self.results_count.grid(row=0, column=1, sticky=tk.NSEW, pady=5)
        # self.replace_button.grid(row=0, column=0, sticky=tk.NS, padx=5)
        # self.find_btns_holder.grid(row=0, column=2, sticky=tk.NSEW, padx=(10, 5))
        # self.selection_button.grid(row=0, column=0, sticky=tk.NSEW, pady=3)
        # self.close_button.grid(row=0, column=1, sticky=tk.NSEW, pady=3)

        # self.config_bindings()

    def config_bindings(self, *args):
        self.find_entry.entry.bind("<Configure>", self.do_find)
    
    def get_term(self):
        return self.find_entry.get()

    def toggle_replace(self, state):
        if state:
            self.replace_enabled = False
            self.replace_entry.grid_remove()
            self.replace_btn_holder.grid_remove()
        else:
            self.replace_enabled = True
            self.replace_entry.grid(row=1, column=0, sticky=tk.NSEW, pady=(0, 5))
            self.replace_btn_holder.grid(row=1, column=1, sticky=tk.NSEW, pady=(0, 5))

    def do_find(self, *args):
        print(self.get_term())
        # self.master.highlighter.highlight_pattern(self.container.find_entry.entry.get())
    
    def refresh_geometry(self, *args):
        self.update_idletasks()
        # self.geometry("+{}+{}".format(*self.master.cursor_screen_location()))

    def show(self, text):
        self.active = True
        self.update_idletasks()
        x = text.winfo_rootx() + text.winfo_width() - self.winfo_width() - self.offset
        y = text.winfo_rooty()
        self.geometry(f"+{x}+{y}")
        self.deiconify()

    def hide(self, *args):
        self.active = False
        self.withdraw()
    
    def reset(self, *args):
        ...
