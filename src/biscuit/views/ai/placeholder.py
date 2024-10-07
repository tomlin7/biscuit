from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.icons import Icons
from biscuit.common.ui import Entry, Frame, IconLabelButton, WebLinkLabel, WrappingLabel

if typing.TYPE_CHECKING:
    ...


class AIPlaceholder(Frame):
    """Home page for the AI assistant view.

    The AIPlaceholder is displayed when the user has not configured the AI assistant.
    - User can enter their API key to start using the AI assistant.
    - API key can be acquired from the Google AI Studio website.
    - The key is stored in the secrets database."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)

        self.label = WrappingLabel(
            self,
            font=self.base.settings.uifont,
            justify=tk.LEFT,
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content,
            text="AI chat to find answer to your queries, configure Google AI API key to start using",
        )
        self.label.pack(fill=tk.X)

        self.api_key = tk.StringVar()
        self.api_entry = Entry(
            self, hint="Enter API Key here...", textvariable=self.api_key
        )
        self.api_entry.pack(fill=tk.X, pady=5)

        confirm_btn = IconLabelButton(
            self,
            text="Start Chat",
            icon=Icons.SPARKLE_FILLED,
            callback=self.start_chat,
            pady=2,
            highlighted=True,
        )
        confirm_btn.pack(fill=tk.X, pady=5)

        self.link = WebLinkLabel(
            self,
            text="Don't have an API key? Get it from here.",
            link="https://aistudio.google.com/app/apikey",
        )
        self.link.config(bg=self.base.theme.views.sidebar.background)
        self.link.pack(fill=tk.X, pady=5)

    def start_chat(self) -> None:
        self.master.add_chat(self.api_key.get())
