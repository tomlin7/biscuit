import tkinter as tk

from biscuit.common.ui import Tree

from ..drawer_item import NavigationDrawerViewItem


class CallStack(NavigationDrawerViewItem):
    """A view that displays the local variables of the debugger.
    Callstack is populated when the debugger is running only."""

    def __init__(self, master, *args, **kwargs) -> None:
        self.title = "Callstack"
        self.__actions__ = ()
        super().__init__(master, itembar=True, *args, **kwargs)

        self.tree = Tree(
            self.content,
            cursor="hand2",
            columns=("fullpath", "line"),
        )
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)
        self.tree.bind("<<TreeviewSelect>>", self.goto_line)

    def show(self, stack: list[tuple[str, str, int]]):
        """Show the call stack from list of tuples (name, filename, line).

        Args:
            stack (list[tuple[str, str, int]]): The call stack to show."""

        self.clear()

        for name, filename, line in stack:
            callstack_str = f"{name} at {filename}, line {line}\n"
            self.tree.add(text=callstack_str, values=(filename, line))

    def clear(self):
        """Clear the call stack."""

        self.tree.delete(*self.tree.get_children())

    def goto_line(self, event):
        """Go to the line of the selected call stack frame.

        Args:
            event (event): The event that triggered the function."""

        item = self.tree.focus()
        if item:
            filename, line = self.tree.item(item, "values")
            self.base.goto_location(filename, str(float(line)))
