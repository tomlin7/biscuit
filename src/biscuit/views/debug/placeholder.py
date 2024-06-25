import tkinter as tk

from biscuit.common.ui import Button, Frame, IconLabelButton, WrappingLabel


class DebugPlaceholder(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)
        self.columnconfigure(0, weight=1)

        WrappingLabel(
            self,
            text="No debugger configuration found for active editor",
            font=("Segoe UI", 10),
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content
        ).grid(row=0, sticky=tk.EW)
