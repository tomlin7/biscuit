from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common import Icons
from biscuit.common.ui import Bubble, Menubutton

from .menu import ActionMenu

if typing.TYPE_CHECKING:
    from .activitybar import ActivityBar


class ActionMenuButton(Menubutton):
    """Menu buttons for the activity bar

    Menu buttons are used to open a menu in the activity bar.
    Action menu instances are attached to these buttons."""

    def __init__(
        self, master: ActivityBar, icon: Icons, text: str, *args, **kwargs
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.bubble = Bubble(self, text=text)
        self.config(
            text=icon,
            relief=tk.FLAT,
            font=("codicon", 12),
            cursor="hand2",
            padx=5,
            pady=1,
            **self.base.theme.layout.sidebar.actionbar.slot,
        )
        self.pack(fill=tk.X, side=tk.TOP)

        self.menu = ActionMenu(self, icon)
        self.bind("<Button-1>", self.menu.show)
        self.bind("<Enter>", self.hover)
        self.bind("<Leave>", self.bubble.hide)

    def hover(self, *_) -> None:
        self.master.switch_menu(self.menu)
        self.bubble.show()
