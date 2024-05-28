from __future__ import annotations

import tkinter as tk
import typing

from src.biscuit.utils import Frame, Toplevel

if typing.TYPE_CHECKING:
    from src.biscuit import App
    from src.biscuit.components.editors.texteditor.text import Text


class Rename(Toplevel):
    def __init__(self, master: App, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(pady=1, padx=1, bg=self.base.theme.border)

        self.tab = None
        self.active = False
        self.withdraw()
        self.overrideredirect(True)

        frame = Frame(self, **self.base.theme.palette)
        frame.pack(fill=tk.BOTH, padx=2, pady=2)

        self.text_variable = tk.StringVar()
        self.entry = tk.Entry(
            frame, font=self.base.settings.font, relief=tk.FLAT, highlightcolor=self.base.theme.biscuit,
            textvariable=self.text_variable, **self.base.theme.palette.searchbar)
        self.entry.grid(sticky=tk.EW, padx=5, pady=3)

        self.entry.bind("<Return>", self.enter)
        self.bind("<FocusOut>", self.hide())
        self.bind("<Escape>", self.hide)

    def clear(self) -> None:
        self.text_variable.set("")

    def focus(self) -> None:
        self.entry.focus()
    
    def get(self):
        return self.text_variable.get()
        
    def enter(self, *_):
        if self.tab:
            self.base.language_server_manager.request_rename(self.tab, self.get())

        self.hide()
    
    def show(self, tab: Text):
        self.tab = tab
        self.focus()
        
        current = tab.get_current_fullword()
        if current is None:
            return
        
        self.text_variable.set(current)
        self.entry.selection_range(0, tk.END)

        self.refresh_geometry(tab)
        self.deiconify()
        self.active = True
    
    def hide(self, *_):
        self.withdraw()
        self.active = False
    
    def refresh_geometry(self, tab: Text):
        self.update_idletasks()
        self.geometry("+{}+{}".format(*tab.cursor_wordstart_screen_location()))
