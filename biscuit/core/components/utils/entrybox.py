import tkinter as tk


class EntryBox(tk.Frame):
    """
    Entry widget with an entra highlight when its focused

    border: border color when entry dont have focus
    highlight: border color when entry has focus
    """
    def __init__(self, master, fg='#424242', bg='#f8f8f8', border='#f8f8f8', highlight='#e1e1e1', *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        
        self.border = border
        self.highlight = highlight
        
        self.config(bg=border, padx=1, pady=1)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.borderframe = tk.Frame(self, bg=bg)
        self.borderframe.grid(row=0, column=0, sticky=tk.NSEW)

        self.term = tk.StringVar()
        self.entry = tk.Entry(self.borderframe, width=30, bg=bg, fg=fg, font=("Helvetica", 11),
            textvariable=self.term, relief=tk.FLAT, insertbackground="#aeafad")
        self.entry.grid(sticky=tk.EW, padx=3, pady=3)

        self.config_bindings()
    
    def get(self):
        return self.term.get()

    def config_bindings(self, *args):
        self.entry.bind("<FocusIn>", self.on_focus)
        self.entry.bind("<FocusOut>", self.off_focus)

    def on_focus(self, *args):
        self.update_idletasks()
        self.config(bg=self.highlight)

    def off_focus(self, *args):
        self.update_idletasks()
        self.config(bg=self.border)
