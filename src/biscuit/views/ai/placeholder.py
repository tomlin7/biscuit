from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.icons import Icons
from biscuit.common.ui import Entry, Frame, IconLabelButton, Label, WebLinkLabel, WrappingLabel

if typing.TYPE_CHECKING:
    ...


class AIPlaceholder(Frame):
    """Home page for the AI assistant view.
    
    Now supports both Google Gemini and Anthropic Claude."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)

        self.label = WrappingLabel(
            self,
            font=self.base.settings.uifont,
            justify=tk.LEFT,
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content,
            text="Configure your AI providers to start chatting.",
        )
        self.label.pack(fill=tk.X, pady=(0, 10))

        # --- Gemini Section ---
        gemini_frame = Frame(self, **self.base.theme.views.sidebar.item)
        gemini_frame.pack(fill=tk.X, pady=5)
        
        Label(gemini_frame, text="Google Gemini", font=self.base.settings.uifont_bold, 
              anchor=tk.W, **self.base.theme.views.sidebar.item.content).pack(fill=tk.X)
        
        self.gemini_key = tk.StringVar(value=self.master.api_keys.get("gemini", ""))
        self.gemini_entry = Entry(gemini_frame, hint="Gemini API Key...", textvariable=self.gemini_key)
        self.gemini_entry.pack(fill=tk.X, pady=2)
        
        # --- Anthropic Section ---
        anthropic_frame = Frame(self, **self.base.theme.views.sidebar.item)
        anthropic_frame.pack(fill=tk.X, pady=10)

        Label(anthropic_frame, text="Anthropic Claude", font=self.base.settings.uifont_bold, 
              anchor=tk.W, **self.base.theme.views.sidebar.item.content).pack(fill=tk.X)
        
        self.anthropic_key = tk.StringVar(value=self.master.api_keys.get("anthropic", ""))
        self.anthropic_entry = Entry(anthropic_frame, hint="Anthropic API Key...", textvariable=self.anthropic_key)
        self.anthropic_entry.pack(fill=tk.X, pady=2)

        confirm_btn = IconLabelButton(
            self,
            text="Save and Start",
            icon=Icons.SPARKLE_FILLED,
            callback=self.start_chat,
            pady=2,
            highlighted=True,
        )
        confirm_btn.pack(fill=tk.X, pady=20)

        self.link = WebLinkLabel(
            self,
            text="Get Gemini Key",
            link="https://aistudio.google.com/app/apikey",
        )
        self.link.pack(fill=tk.X)
        
        self.link2 = WebLinkLabel(
            self,
            text="Get Anthropic Key",
            link="https://console.anthropic.com/settings/keys",
        )
        self.link2.pack(fill=tk.X)

    def start_chat(self) -> None:
        self.master.save_keys(self.gemini_key.get(), self.anthropic_key.get())
