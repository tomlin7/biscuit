import os
import tkinter as tk
from typing import Callable, List

from biscuit.common.icons import Icons
from biscuit.common.ui import Icon, Shortcut
from biscuit.common.ui.native import Frame, Label


class RecentItem(Frame):
    """Recent Menu Item"""

    def __init__(self, master, path: str, callback: Callable, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.text = path
        self.callback = callback

        self.bg, self.fg, self.hbg, self.hfg = self.base.theme.editors.values()

        self.label = Label(
            self, text=os.path.basename(path), fg=self.base.theme.biscuit_light
        )
        self.label.bind("<Button-1>", self.callback)
        self.label.pack(side=tk.LEFT, padx=5)

        self.fullpath_label = Label(
            self, text=os.path.abspath(path), fg=self.base.theme.biscuit
        )
        self.fullpath_label.pack(side=tk.RIGHT, padx=5)

        # self.close_button = Icon(
        #     self, icon=Icons.CLOSE, fg=self.base.theme.biscuit_light
        # )
        # self.close_button.pack(side=tk.LEFT, padx=5)

        self.config(padx=5, pady=5)
        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)
        self.bind("<Button-1>", self.callback)
        self.label.bind("<Button-1>", self.callback)
        self.fullpath_label.bind("<Button-1>", self.callback)
        self.on_leave()

    def on_enter(self, *_) -> None:
        self.config(bg=self.hbg)
        self.label.config(bg=self.hbg)
        self.fullpath_label.config(bg=self.hbg)
        # self.close_button.config(bg=self.base.theme.border)

    def on_leave(self, *_) -> None:
        self.config(bg=self.bg)
        self.label.config(bg=self.bg)
        self.fullpath_label.config(bg=self.bg)

        # self.close_button.config(bg=self.bg)


class QuickItem(Frame):
    """Quick Menu Item"""

    def __init__(
        self,
        master,
        text: str,
        icon: str,
        callback: Callable,
        shortcut: List[str],
        *args,
        **kwargs
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.text = text
        self.icon = icon
        self.callback = callback
        self.shortcut = shortcut

        self.bg, self.fg, self.hbg, self.hfg = self.base.theme.editors.values()

        self.icon = Icon(self, icon=icon, fg=self.base.theme.biscuit_light)
        self.icon.pack(side=tk.LEFT, padx=5)

        self.label = Label(self, text=text, fg=self.base.theme.biscuit_light)
        self.label.bind("<Button-1>", self.callback)
        self.label.pack(side=tk.LEFT, padx=5)

        self.shortcutlabel = Shortcut(self, shortcut)
        self.shortcutlabel.pack(side=tk.RIGHT, padx=5)
        self.shortcutlabel.bind("<Button-1>", self.callback)

        self.config(padx=5, pady=5)
        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)
        self.bind("<Button-1>", self.callback)
        self.on_leave()

    def on_enter(self, *_) -> None:
        self.config(bg=self.base.theme.border)
        self.icon.config(bg=self.base.theme.border)
        self.label.config(bg=self.base.theme.border)
        self.shortcutlabel.config(bg=self.base.theme.border)

    def on_leave(self, *_) -> None:
        self.config(bg=self.bg)
        self.icon.config(bg=self.bg)
        self.label.config(bg=self.bg)
        self.shortcutlabel.config(bg=self.bg)
