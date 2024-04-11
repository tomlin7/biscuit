import tkinter as tk

from biscuit.core.utils import Button, Frame, WrappingLabel
from biscuit.core.utils.iconlabelbutton import IconLabelButton


class ExtensionsPlaceholder(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)
        self.columnconfigure(0, weight=1)

        WrappingLabel(self, text="Fetching extensions failed, check your internet connection.", font=("Segoe UI", 10), anchor=tk.W, **self.base.theme.views.sidebar.item.content).grid(row=0, sticky=tk.EW)

        open_btn = IconLabelButton(self, text="Retry", icon="sync", function=self.retry, pady=2, highlighted=True)
        open_btn.grid(row=1, pady=5, sticky=tk.EW)

    def retry(self, *_) -> None:
        self.master.refresh()
