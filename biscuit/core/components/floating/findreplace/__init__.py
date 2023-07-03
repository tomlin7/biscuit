import tkinter as tk

from .results import FindResults

from core.components.utils import IconButton, Frame, Toplevel, ButtonsEntry


class FindReplace(Toplevel):
    def __init__(self, base, *args, **kwargs):
        super().__init__(base, *args, **kwargs)
        self.offset = 10
        self.active = False
        self.overrideredirect(True)
        self.config(padx=1, pady=1, bg=self.base.theme.border)
        self.withdraw()

        self.container = Frame(self, padx=5, pady=5, **self.base.theme.findreplace)
        self.container.pack(fill=tk.BOTH)
        self.container.grid_columnconfigure(0, weight=1)

        # find
        self.findbox = ButtonsEntry(self.container, hint="Find", buttons=(('case-sensitive',), ('whole-word',), ('regex',)))
        self.findbox.grid(row=0, column=0, pady=2)

        self.results_count = FindResults(self.container)
        self.results_count.grid(row=0, column=1, sticky=tk.NSEW, padx=5, pady=2)
        
        buttons = Frame(self.container, **self.base.theme.findreplace)
        buttons.grid(row=0, column=2, sticky=tk.NSEW, pady=2)
        IconButton(buttons, 'arrow-up').pack(side=tk.LEFT)
        IconButton(buttons, 'arrow-down').pack(side=tk.LEFT)
        IconButton(buttons, 'list-selection').pack(side=tk.LEFT)
        IconButton(buttons, 'close').pack(side=tk.LEFT)

        # replace
        self.replacebox = ButtonsEntry(self.container, hint="Replace", buttons=(('preserve-case',),))
        self.replacebox.grid(row=1, column=0, sticky=tk.NSEW, pady=2)

        buttons = Frame(self.container, **self.base.theme.findreplace)
        buttons.grid(row=1, column=1, sticky=tk.NSEW, padx=5, pady=2)
        IconButton(buttons, "replace-all").pack(side=tk.LEFT)

        self.config_bindings()

    def config_bindings(self, *args):
        self.findbox.entry.bind("<Configure>", self.do_find)
    
    def get_term(self):
        return self.findbox.get()

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
