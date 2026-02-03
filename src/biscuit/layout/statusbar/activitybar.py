from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common import Frame, Menu
from biscuit.common.icons import Icons

from .actionbutton import ActionButton
from .menubutton import ActionMenuButton

if typing.TYPE_CHECKING:
    from biscuit.views import SideBarView

    from ..sidebar import SideBar
    from .statusbar import Statusbar


class ActivityBar(Frame):
    def __init__(self, master: Statusbar, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.layout.sidebar.actionbar)

        self.buttons: list[ActionButton] = []
        self.active_button: ActionButton = None

        self.menus = []
        # self.add_menus()

    def attach_sidebar(self, sidebar: SideBar) -> None:
        self.sidebar = sidebar

    def add_view(self, view: SideBarView) -> None:
        btn = ActionButton(self, view.__icon__, view.name, view=view)
        btn.pack(side=tk.LEFT)
        self.buttons.append(btn)
        
    def add_button(self, icon: str, name: str, callback: typing.Callable) -> None:
        btn = ActionButton(self, icon, name, callback=callback)
        btn.pack(side=tk.LEFT)

    def add_separator(self) -> None:
        sep = Frame(self, width=1, bg=self.base.theme.border)
        sep.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)

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
        settings_menu = self.add_menu(Icons.SETTINGS_GEAR, "manage")
        settings_menu.add_command(
            "Command Palette", lambda *_: self.base.palette.show(">")
        )
        settings_menu.add_separator()
        settings_menu.add_command("Settings", self.base.commands.open_settings)

    def add_menu(self, icon: str, text: str) -> Menu:
        menu_btn = ActionMenuButton(self, icon, text)
        menu_btn.pack(side=tk.LEFT)
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
