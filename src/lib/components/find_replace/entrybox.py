import tkinter as tk
from tkinter import font


class EntryBox(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(bg="#ffffff", padx=1, pady=1)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.term = tk.StringVar()

        self.entry_frame = frame = tk.Frame(self, bg="#ffffff")
        frame.grid(row=0, column=0, sticky=tk.NSEW)

        self.entry = tk.Entry(
            frame, width=30, bg="#ffffff", fg="#616161", font=("Helvetica", 11),
            textvariable=self.term, relief=tk.FLAT, insertbackground="#616161")
        self.entry.grid(sticky=tk.EW, padx=3, pady=3)

        self.config_bindings()
    
    def get(self):
        return self.term.get()

    def config_bindings(self, *args): ...
        # self.entry.bind("<FocusIn>", self.on_focus)
        # self.entry.bind("<FocusOut>", self.off_focus)

    def on_focus(self, *args):
        self.update_idletasks()
        self.config(bg="#0090f1")

    def off_focus(self, *args):
        self.update_idletasks()
        self.config(bg="#ffffff")