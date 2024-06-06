from __future__ import annotations

import tkinter as tk
import typing

from src.biscuit.common.ui import Bubble, Menubutton, get_codicon

if typing.TYPE_CHECKING:
    from src.biscuit.views import NavigationDrawerView

    from .activitybar import ActivityBar


class ActionButton(Menubutton):
    """Action buttons for activity bar

    Action buttons are used to switch between views in the navigation drawer,
    view instances are attached to these buttons."""

    def __init__(
        self, master: ActivityBar, view: NavigationDrawerView, *args, **kwargs
    ) -> None:
        super().__init__(master, *args, **kwargs)
        """Initializes the action button.
        
        Args:
            master (ActivityBar): The activity bar.
            view (SidebarView): The view to attach to the button."""

        self.view = view
        self.enabled = False

        self.bubble = Bubble(self, text=view.name)
        self.bind("<Enter>", self.bubble.show)
        self.bind("<Leave>", self.bubble.hide)

        self.config(
            text=get_codicon(view.__icon__),
            relief=tk.FLAT,
            font=("codicon", 20),
            cursor="hand2",
            padx=13,
            pady=11,
            **self.base.theme.layout.drawer.actionbar.slot,
        )
        self.pack(fill=tk.X, side=tk.TOP)

        self.bind("<Button-1>", self.toggle)

    def toggle(self, *_) -> None:
        if not self.enabled:
            self.master.set_active_slot(self)
            self.enable()
        else:
            self.disable()

        self.bubble.hide()

    def enable(self) -> None:
        if not self.enabled:
            self.view.grid(column=1, row=0, sticky=tk.NSEW, padx=(0, 1))
            self.config(
                fg=self.base.theme.layout.drawer.actionbar.slot.selectedforeground
            )
            self.enabled = True

    def disable(self) -> None:
        if self.enabled:
            self.view.grid_remove()
            self.config(fg=self.base.theme.layout.drawer.actionbar.slot.foreground)
            self.enabled = False
