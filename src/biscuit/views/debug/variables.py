import tkinter as tk

import pyperclip

from biscuit.common.ui import Tree
from biscuit.views.debug.menu import VariablesContextMenu

from ..drawer_item import NavigationDrawerViewItem


class Variables(NavigationDrawerViewItem):
    """A view that displays the local variables of the debugger.
    Variables are populated when the debugger is running only."""

    def __init__(self, master, *args, **kwargs) -> None:
        self.title = "Variables"
        self.__actions__ = ()
        super().__init__(master, itembar=True, *args, **kwargs)

        self.tree = Tree(
            self.content,
            style="mono.Treeview",
            columns=("key", "value"),
            *args,
            **kwargs,
        )
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)

        self.ctxmenu = VariablesContextMenu(self)

        self.tree.bind("<Button-3>", self.right_click)
        self.tree.tree.tag_configure("bold", font=self.base.settings.uifont_bold)

    def right_click(self, e: tk.Event) -> None:
        if item := self.tree.identify_row(e.y):
            self.tree.selection_set(item)
            self.tree.focus(item)
            self.ctxmenu.show(e)

    def show(self, section_name: str = "", d: dict = {}, open_: bool = False):
        """Show the variables in the tree.

        Args:
            d (dict): mapping of variable names to values
            section (str): section name for grouping variables
        """
        section_node = self.tree.insert(
            "", "end", text=section_name, open=open_, tags=("bold",)
        )
        self._insert_items(d, parent=section_node)

    def _insert_items(self, d: dict, parent: str):
        for key, value in d.items():
            if isinstance(value, dict):
                node = self.tree.insert(
                    parent, "end", text=key, values=(key, str(value))
                )
                self._insert_items(value, parent=node)
            else:
                self.tree.insert(
                    parent,
                    "end",
                    text=f"{key} = {value}",
                    values=(key, str(value)),
                )

    def clear(self):
        """Clear the local variables."""

        try:
            self.tree.delete(*self.tree.get_children())
        except tk.TclError:
            pass

    def copy_value(self):
        """Copy the value of the selected variable to the clipboard."""
        pyperclip.copy(self.tree.set(self.tree.focus(), "value"))

    def copy_expression(self):
        """Copy the expression of the selected variable to the clipboard."""
        pyperclip.copy(self.tree.item(self.tree.focus(), "text"))

    def copy_name(self):
        """Copy the name of the selected variable to the clipboard."""
        pyperclip.copy(self.tree.set(self.tree.focus(), "key"))

    def set_value(self):
        """Set the value of the selected variable."""
        pass
