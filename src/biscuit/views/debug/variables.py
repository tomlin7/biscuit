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

    def show(self, locals: list[str, str]):
        """Show the variables from the given list of locals (name, value)

        Args:
            locals (list[str, str]): The local variables to show."""

        self.clear()
        for var, val in locals:
            locals_str = f"{var}: {val}"
            self.tree.add(text=locals_str)

    def clear(self):
        """Clear the local variables."""

        self.tree.delete(*self.tree.get_children())
