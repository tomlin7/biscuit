import tkinter as tk


class Shortcut(tk.Frame):
    def __init__(self, master, shortcuts, sc_bg="#f3f3f3", sc_fg="#767676", *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.shortcuts = shortcuts
        self.bg = master.bg
        
        self.sc_bg = sc_bg
        self.sc_fg = sc_fg
        
        self.add_shortcuts()

    def add_shortcuts(self):
        for shortcut in self.shortcuts[:-1]:
            self.add_shortcut(shortcut)
            self.add_separator()
        self.add_shortcut(self.shortcuts[-1])

    def add_separator(self):
        tk.Label(self, text="+", bg=self.bg).pack(padx=2, side=tk.LEFT)

    def add_shortcut(self, shortcut):
        tk.Label(
            self, text=shortcut, bg=self.sc_bg, fg=self.sc_fg, 
            font=("Consolas", 8)).pack(padx=2, side=tk.LEFT)