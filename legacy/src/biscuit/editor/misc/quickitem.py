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

        self.text = os.path.abspath(path)
        self.callback = callback

        self.bg, self.fg, self.hbg, self.hfg = self.base.theme.views.values()
        self.config(bg=self.bg)

        self.frame = Frame(self, bg=self.bg)
        self.frame.pack(pady=1, padx=1, expand=True, fill=tk.BOTH)

        self.frame2 = Frame(self.frame, bg=self.base.theme.border, pady=2)
        self.frame2.pack(fill=tk.BOTH, expand=True, pady=(3, 0))

        self.label = tk.Label(
            self.frame2,
            text=os.path.basename(path).upper(),
            bg=self.base.theme.border,  # self.base.theme.editors.background,
            fg="#918375",  # self.base.theme.border,
            font=("Consolas", 10, "bold"),
        )
        self.label.pack(side=tk.LEFT, padx=5)

        self.fullpath_label = Label(
            self.frame2, text=(
                "..." + os.path.abspath(path)[-25:]
                if len(os.path.abspath(path)) > 25
                else os.path.abspath(path)
            ),
            bg=self.base.theme.border,  # self.base.theme.editors.background,
            fg="#655c54",  # self.base.theme.border,
        )
        self.fullpath_label.pack(side=tk.RIGHT, padx=5)

        # self.close_button = Icon(
        #     self, icon=Icons.CLOSE, fg=self.base.theme.biscuit_light
        # )
        # self.close_button.pack(side=tk.LEFT, padx=5)

        self.frame2.bind("<Button-1>", self.callback)
        self.label.bind("<Button-1>", self.callback)
        self.fullpath_label.bind("<Button-1>", self.callback)

        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)

    def on_enter(self, *_) -> None:
        self.frame.config(**self.base.theme.editors)
        self.label.config(fg=self.base.theme.biscuit)
        self.fullpath_label.config(fg="#a79985")
        self.frame2.pack(fill=tk.BOTH, expand=True, pady=(0, 3))
    
    def on_leave(self, *_) -> None:
        self.frame.config(bg=self.bg)
        self.label.config(fg="#918375")
        self.fullpath_label.config(fg="#655c54")
        self.frame2.pack(fill=tk.BOTH, expand=True, pady=(3, 0))
       

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
