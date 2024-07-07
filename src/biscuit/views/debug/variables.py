import tkinter as tk

from biscuit.common.ui import Tree

from ..drawer_item import NavigationDrawerViewItem


class Variables(NavigationDrawerViewItem):
    """A view that displays the local variables of the debugger.
    Variables are populated when the debugger is running only."""

    def __init__(self, master, *args, **kwargs) -> None:
        self.title = "Variables"
        self.__actions__ = ()
        super().__init__(master, itembar=True, *args, **kwargs)

        self.tree = Tree(self.content, style="mono.Treeview", *args, **kwargs)
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)

        self.tree.tree.tag_configure("bold", font=self.base.settings.uifont_bold)

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
                node = self.tree.insert(parent, "end", text=key)
                self._insert_items(value, parent=node)
            else:
                self.tree.insert(parent, "end", text=f"{key} = {value}")

    def clear(self):
        """Clear the local variables."""

        try:
            self.tree.delete(*self.tree.get_children())
        except tk.TclError:
            pass
