from __future__ import annotations

import tkinter as tk
import typing

from src.biscuit.common import Frame, Menu

from .actionbutton import ActionButton
from .menubutton import ActionMenuButton

if typing.TYPE_CHECKING:
    from src.biscuit.views import NavigationDrawerView

    from .drawer import NavigationDrawer


class ActivityBar(Frame):
    def __init__(self, master: NavigationDrawer, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(width=150, **self.base.theme.layout.base.sidebar.slots)

        self.buttons: list[ActionButton] = []
        self.active_button: ActionButton = None

        self.menus = []
        self.add_menus()

    def add_view(self, view: NavigationDrawerView) -> None:
        btn = ActionButton(self, view)
        btn.pack(fill=tk.Y)
        self.buttons.append(btn)

    def toggle_first_slot(self) -> None:
        self.buttons[0].toggle()

    def set_active_slot(self, selected_button: ActionButton) -> None:
        self.active_button = selected_button
        for button in self.buttons:
            if button != selected_button:
                button.disable()

    def add_menus(self) -> None:
        self.add_settings_menu()

    def add_settings_menu(self) -> None:
        settings_menu = self.add_menu("settings-gear", "manage")
        settings_menu.add_item(
            "Command Palette", lambda *_: self.base.palette.show(">")
        )
        settings_menu.add_separator()
        settings_menu.add_item("Settings", self.base.commands.open_settings)

    def add_menu(self, icon: str, text: str) -> Menu:
        menu_btn = ActionMenuButton(self, icon, text)
        menu_btn.pack(side=tk.BOTTOM, fill=tk.X, padx=0)
        self.menus.append(menu_btn.menu)

        return menu_btn.menu

    def close_all_menus(self, *_) -> None:
        for menu in self.menus:
            menu.hide()

    def switch_menu(self, menu: Menu) -> None:
        active = False
        for i in self.menus:
            if i.active:
                active = True
            if i != menu:
                i.hide()

        if active:
            menu.show()
