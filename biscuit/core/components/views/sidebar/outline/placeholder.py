import tkinter as tk

from biscuit.core.components.utils import Frame, WrappingLabel


class OutlineTreePlaceholder(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=10, pady=10, **self.base.theme.views.sidebar.item)

        WrappingLabel(self, text="No outline information", font=("Segoe UI", 10), 
                      anchor=tk.W, **self.base.theme.views.sidebar.item.content).pack(fill=tk.BOTH, expand=True)
