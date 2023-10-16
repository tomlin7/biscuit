import tkinter as tk

from biscuit.core.components.utils import Frame

from ...utils import Icon, IconButton, Label


class Notification(Frame):
    def __init__(self, master, icon: str, text: str, fg: str, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.notifications)

        self.icon = Icon(self, icon, padx=5, **self.base.theme.utils.iconbutton)
        self.icon.config(fg=fg)
        self.icon.pack(side=tk.LEFT, fill=tk.BOTH)

        self.label = Label(self, text=text, anchor=tk.W, padx=10, pady=10, **self.base.theme.utils.iconbutton)
        self.label.pack(side=tk.LEFT, expand=1, fill=tk.BOTH)

        close_button = IconButton(self, "close", self.delete)
        close_button.pack(side=tk.RIGHT, fill=tk.BOTH)

    def delete(self):
        self.master.delete(self)
