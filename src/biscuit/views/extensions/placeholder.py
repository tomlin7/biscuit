import tkinter as tk

from src.biscuit.common.ui import Frame, IconLabelButton, WrappingLabel


class ExtensionsPlaceholder(Frame):
    """Placeholder view for the extensions view.

    The ExtensionsPlaceholder is displayed when the user has not yet fetched the extensions.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=15, pady=10, **self.base.theme.views.sidebar.item)
        self.columnconfigure(0, weight=1)

        WrappingLabel(
            self,
            text="Fetching extensions failed, check your internet connection.",
            font=("Segoe UI", 10),
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content
        ).grid(row=0, sticky=tk.EW)

        open_btn = IconLabelButton(
            self,
            text="Retry",
            icon="sync",
            function=self.retry,
            pady=2,
            highlighted=True,
        )
        open_btn.grid(row=1, pady=5, sticky=tk.EW)

    def retry(self, *_) -> None:
        self.master.refresh()
