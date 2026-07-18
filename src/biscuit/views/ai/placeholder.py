from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, IconLabelButton, Label, WrappingLabel

if typing.TYPE_CHECKING:
    ...


class AIPlaceholder(Frame):
    """Placeholder shown when no API keys are configured."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)

        WrappingLabel(
            self,
            font=self.base.settings.uifont,
            justify=tk.LEFT,
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content,
            text="Configure your AI providers in Settings to start using the coding agent.",
        ).pack(fill=tk.X, pady=(0, 10))

        IconLabelButton(
            self,
            text="Open Settings",
            icon=Icons.SETTINGS,
            callback=self.master.open_settings,
            pady=2,
            highlighted=True,
).pack(fill=tk.X, pady=5)
