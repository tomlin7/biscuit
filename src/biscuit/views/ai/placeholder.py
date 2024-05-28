from __future__ import annotations

import tkinter as tk
import typing

from src.biscuit.utils import (Entry, Frame, IconLabelButton, WebLinkLabel,
                               WrappingLabel)

if typing.TYPE_CHECKING:
    ...
    
class AIPlaceholder(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)

        self.label = WrappingLabel(self, font=("Segoe UI", 10), justify=tk.LEFT, anchor=tk.W, **self.base.theme.views.sidebar.item.content,
                                   text="Bikkis is an AI assistant that can answer your queries right within Biscuit, you will need a Google AI Studio API key to start using it.")
        self.label.pack(fill=tk.X)
        
        self.api_key = tk.StringVar()
        self.api_entry = Entry(self, hint="Enter API Key", textvariable=self.api_key)
        self.api_entry.pack(fill=tk.X, pady=5)

        confirm_btn = IconLabelButton(self, text="Start Chat", icon="sparkle-filled", function=self.start_chat, pady=2, highlighted=True)
        confirm_btn.pack(fill=tk.X, pady=5)
        
        self.link = WebLinkLabel(self, text="Don't have an API key? Get it from here.", link="https://aistudio.google.com/app/apikey")
        self.link.config(bg=self.base.theme.views.sidebar.background)
        self.link.pack(fill=tk.X, pady=5)

    def start_chat(self) -> None:
        self.master.add_chat(self.api_key.get())
