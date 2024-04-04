from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from . import Slots
    from biscuit.core.components.views import SidebarView

import tkinter as tk

from biscuit.core.components.utils import Bubble, Menubutton, get_codicon


class Slot(Menubutton):
    def __init__(self, master: Slots, view: SidebarView, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.view = view
        self.enabled = False

        self.bubble = Bubble(self, text=view.name)
        self.bind('<Enter>', self.bubble.show)
        self.bind('<Leave>', self.bubble.hide)

        self.config(text=get_codicon(view.__icon__), relief=tk.FLAT, font=("codicon", 20), cursor="hand2", 
                    padx=13, pady=11, **self.base.theme.layout.base.sidebar.slots.slot)
        self.pack(fill=tk.X, side=tk.TOP)

        self.bind('<Button-1>', self.toggle)

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
            self.config(fg=self.base.theme.layout.base.sidebar.slots.slot.selectedforeground)
            self.enabled = True

    def disable(self) -> None:
        if self.enabled:
            self.view.grid_remove()
            self.config(fg=self.base.theme.layout.base.sidebar.slots.slot.foreground)
            self.enabled = False
