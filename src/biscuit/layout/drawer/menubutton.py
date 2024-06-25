from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.ui import Bubble, Menubutton, get_codicon

from .menu import ActionMenu

if typing.TYPE_CHECKING:
    from .drawer import NavigationDrawer


class ActionMenuButton(Menubutton):
    """Menu buttons for the activity bar

    Menu buttons are used to open a menu in the activity bar.
    Action menu instances are attached to these buttons."""

    def __init__(
        self, master: NavigationDrawer, icon: str, text: str, *args, **kwargs
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.bubble = Bubble(self, text=text)
        self.config(
            text=get_codicon(icon),
            relief=tk.FLAT,
            font=("codicon", 20),
            cursor="hand2",
            padx=10,
            pady=10,
            **self.base.theme.layout.drawer.actionbar.slot,
        )
        self.pack(fill=tk.X, side=tk.TOP)

        self.menu = ActionMenu(self, icon)
        self.bind("<Button-1>", self.menu.show)
        self.bind("<Enter>", self.hover)
        self.bind("<Leave>", self.bubble.hide)

    def hover(self, *_) -> None:
        self.master.switch_menu(self.menu)
        self.bubble.show()
