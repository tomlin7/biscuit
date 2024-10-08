from __future__ import annotations

import tkinter as tk
from typing import Callable, Union

from biscuit.common.menu.submenu import SubMenu

from ..ui import Frame, Toplevel
from .checkable import Checkable
from .command import Command
from .separator import Separator

# TODO Menus
# - Have various types of menus
# - Context menus for various buttons across the editor
# - Make the api more clean and easy to use like palette
#   - isolate tkinter_menus library


class Menu(Toplevel):
    """Base class for all menus
    Underlying is a Toplevel widget with a container frame
    that holds the menu items and separators.

    Supports adding commands, checkables and separators"""

    def __init__(self, master, name: str = None, *args, **kwargs) -> None:
        """Create a new menu

        Args:
            master (tk.Tk): The master widget
            name (str, optional): The name of the menu. Defaults to None.
        """

        super().__init__(master, *args, **kwargs)
        self.active = False
        self.name = name

        self.config(bg=self.base.theme.border)
        self.withdraw()
        self.overrideredirect(True)

        self.container = Frame(self, padx=5, pady=5, **self.base.theme.menu)
        self.container.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)
        self.container.grid_columnconfigure(0, weight=1)
        self.container.grid_rowconfigure(0, weight=1)
        self.container.hide = self.hide

        self.menu_items = []
        self.row = 0

        self.hold_focus = False

        self.config_bindings()

    def config_bindings(self) -> None:
        self.bind("<FocusOut>", self.hide_check)
        self.bind("<Escape>", self.hide)

    def get_coords(self, *e) -> tuple:
        """This method is to be overridden by subclasses to provide
        custom placement of the menu that may or may not depend on the event.
        The method may take the event as arguments and must return
        the x, y coordinates as a tuple of integers.

        Args:
            *e: The event that triggered the menu

        Returns:
            tuple: The x, y coordinates
        """

        return (
            self.master.winfo_rootx(),
            self.master.winfo_rooty() + self.master.winfo_height(),
        )

    def show(self, *e) -> None:
        """Show the menu at the given event coordinates
        For relative placement, override the get_coords method
        in the subclass and also bind the event to this method.

        Args:
            *e: The event that triggered the menu"""

        self.active = True
        self.update_idletasks()

        x, y = self.get_coords(*e)
        self.wm_geometry(f"+{x}+{y}")

        self.deiconify()
        self.focus_set()

    def hide(self, *args) -> None:
        """Hide the menu and set the active flag to False"""

        self.active = False
        self.withdraw()
        self.master.event_generate("<<Hide>>")

    def hide_check(self, e) -> None:
        """If submenus are active, dont hide the menu"""

        if self.hold_focus:
            return

        self.hide()

    def add_item(self, item: Union[Command, Checkable]) -> Command:
        """Add a menu item to the menu
        Not to be confused with the add_command or add_checkable methods.
        This method is used to add an item that is already created to the menu.

        Args:
            item (Union[Command, Checkable]): The menu item to add
        """

        item.grid(row=self.row, sticky=tk.EW, pady=0)
        self.menu_items.append(item)

        self.row += 1
        return item

    def add_checkable(self, text, command=lambda *_: ..., checked=False) -> Checkable:
        """Add a checkable item to the menu

        Args:
            text (str): The text to display on the menu item
            command (Callable, optional): The command to run when the item is clicked. Defaults to lambda *_:....
            checked (bool, optional): The initial checked state. Defaults to False.

        Returns:
            Checkable: The created checkable menu item"""

        new_item = Checkable(self.container, text, command, checked=checked)
        return self.add_item(new_item)

    def add_command(
        self, text: str, command: Callable = lambda *_: ..., *args, **kwargs
    ) -> Command:
        """Add a command to the menu

        Args:
            text (str): The text to display on the menu item
            command (Callable, optional): The command to run when the item is clicked. Defaults to lambda *_:....

        Returns:
            Command: The created menu item"""

        new_item = Command(self.container, text, command, *args, **kwargs)
        return self.add_item(new_item)

    def add_separator(self, length=18) -> Separator:
        """Add a separator to the menu

        Args:
            length (int, optional): The length of the separator. Defaults to 18.

        Returns:
            Separator: The created separator"""

        new_sep = Separator(self.container, length)
        new_sep.grid(row=self.row, sticky=tk.EW, pady=0)
        self.menu_items.append(new_sep)

        self.row += 1
        return new_sep

    def add_menu(self, text: str) -> SubMenu:
        """Add a new menu to the menu

        Args:
            text (str): The text of the menu

        Returns:
            Menu: The created menu"""

        new_item = SubMenu(self, self.container, text)
        return self.add_item(new_item)

    def clear(self) -> None:
        """Clear all menu items from the menu"""

        for item in self.menu_items:
            item.destroy()

        self.menu_items = []
        self.row = 0
