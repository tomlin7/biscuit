from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from .. import Panel
    from biscuit.core.components.utils import IconButton

import tkinter as tk

from biscuit.core.components.utils import Frame, IconButton

from .tabs import Tabs


class Panelbar(Frame):
    """Panelbar 
    
    Contains the Tabs of panel views and control buttons of each view
    """
    
    def __init__(self, master: Panel, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        content = self.master.master

        self.config(**self.base.theme.layout.base.content.panel.bar)

        self.tabs = Tabs(self)
        self.tabs.pack(fill=tk.X, side=tk.LEFT, expand=True)

        self.buttons = []
        self.default_buttons = (('close', content.toggle_panel), ('chevron-up', content.toggle_max_panel, 'chevron-down'))
        
        for button in self.default_buttons:
            IconButton(self, *button).pack(side=tk.RIGHT)

    def add_buttons(self, buttons: list[IconButton]) -> None:
        "add control buttons of a view"
        for button in buttons:
            button.pack(side=tk.LEFT)
            self.buttons.append(button)
    
    def replace_buttons(self, buttons: list[IconButton]) -> None:
        "replace control"
        self.clear()
        self.add_buttons(buttons)
        
    def clear(self) -> None:
        for button in self.buttons:
            button.pack_forget()
        self.buttons.clear()
