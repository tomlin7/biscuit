from __future__ import annotations

import tkinter as tk
import typing

from biscuit.core.utils import Entry, Frame, IconLabelButton, WrappingLabel

if typing.TYPE_CHECKING:
    ...
    
class AIPlaceholder(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)

        self.label = WrappingLabel(self, text="Gemini API Key", font=("Segoe UI", 10), 
                      anchor=tk.W, **self.base.theme.views.sidebar.item.content)
        self.label.pack(fill=tk.X)
        
        self.api_entry = Entry(self, hint="Enter API Key")
        self.api_entry.pack(fill=tk.X, pady=5)

        confirm_btn = IconLabelButton(self, text="Start Chat", icon="sparkle-filled", function=self.start_chat, pady=2, highlighted=True)
        confirm_btn.pack(fill=tk.X, pady=5)
        
    def start_chat(self) -> None:
        self.master.add_chat(self.api_entry.get())
